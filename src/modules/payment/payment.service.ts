import type Stripe from "stripe";
import { prisma } from "../../config/db";
import { stripe } from "../../config/stripe";
import { AppError } from "../../utils/AppError";
import type { CreateCheckoutInput } from "./payment.validator";

// ─── Create Stripe Checkout Session ──────────────────────────────────────────

export const createCheckoutSession = async (
  callerId: string,
  data: CreateCheckoutInput,
) => {
  // 1. Validate the emergency request belongs to this patient
  const request = await prisma.emergencyRequest.findFirst({
    where: { id: data.requestId, callerId, deletedAt: null },
    include: { payment: true },
  });
  if (!request) {
    throw new AppError("Emergency request not found", 404);
  }

  // 2. Prevent double-payment
  if (request.payment && request.payment.status === "SUCCESS") {
    throw new AppError("This request has already been paid", 409);
  }

  // 3. Only allow payment for dispatched or completed requests
  if (!["DISPATCHED", "COMPLETED"].includes(request.status)) {
    throw new AppError(
      "Payment is only allowed for dispatched or completed requests",
      400,
    );
  }

  // 4. Create Stripe Checkout Session
  // Stripe amounts are in the smallest currency unit (paisa for BDT)
  const amountInPaisa = Math.round(data.amount * 100);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: data.currency.toLowerCase(),
          product_data: {
            name: "Emergency Ambulance Service",
            description: `Request ID: ${data.requestId} | Pickup: ${request.pickupAddress}`,
          },
          unit_amount: amountInPaisa,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    metadata: {
      requestId: data.requestId,
      callerId,
    },
    success_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.CLIENT_URL || "http://localhost:3000"}/payment/cancel`,
  });

  // 5. Upsert a pending Payment record in DB
  const payment = await prisma.payment.upsert({
    where: { requestId: data.requestId },
    update: {
      amount: data.amount,
      currency: data.currency.toUpperCase(),
      gateway: "STRIPE",
      sessionId: session.id,
      status: "PENDING",
    },
    create: {
      requestId: data.requestId,
      amount: data.amount,
      currency: data.currency.toUpperCase(),
      gateway: "STRIPE",
      sessionId: session.id,
      status: "PENDING",
    },
  });

  return {
    sessionId: session.id,
    checkoutUrl: session.url,
    payment,
  };
};

// ─── Get Payment Status for a Request ────────────────────────────────────────

export const getPaymentByRequestId = async (
  requestId: string,
  callerId: string,
  role: string,
) => {
  const request = await prisma.emergencyRequest.findFirst({
    where: { id: requestId, deletedAt: null },
  });
  if (!request) throw new AppError("Emergency request not found", 404);

  // Only the patient who owns the request or ADMIN can view payment
  if (role !== "ADMIN" && request.callerId !== callerId) {
    throw new AppError("Access denied", 403);
  }

  const payment = await prisma.payment.findUnique({
    where: { requestId },
  });
  if (!payment) throw new AppError("No payment found for this request", 404);

  return payment;
};

// ─── Handle Stripe Webhook Events ────────────────────────────────────────────

export const handleStripeWebhook = async (
  rawBody: Buffer,
  signature: string,
  webhookSecret: string,
) => {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    throw new AppError(
      `Webhook signature verification failed: ${(err as Error).message}`,
      400,
    );
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const requestId = session.metadata?.requestId;
      if (!requestId) break;

      await prisma.payment.update({
        where: { requestId },
        data: {
          status: "SUCCESS",
          gatewayTxnId: session.payment_intent as string,
        },
      });

      // Move request to COMPLETED if it was still DISPATCHED
      await prisma.emergencyRequest.updateMany({
        where: {
          id: requestId,
          status: { in: ["DISPATCHED", "PENDING"] },
        },
        data: { status: "COMPLETED" },
      });

      console.log(`✅ Payment SUCCESS for request: ${requestId}`);
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const requestId = session.metadata?.requestId;
      if (!requestId) break;

      await prisma.payment.updateMany({
        where: { requestId, status: "PENDING" },
        data: { status: "FAILED" },
      });

      console.log(`❌ Payment EXPIRED for request: ${requestId}`);
      break;
    }

    case "payment_intent.payment_failed": {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const requestId = paymentIntent.metadata?.requestId;
      if (!requestId) break;

      await prisma.payment.updateMany({
        where: { requestId, status: "PENDING" },
        data: {
          status: "FAILED",
          gatewayTxnId: paymentIntent.id,
        },
      });

      console.log(`❌ Payment FAILED for request: ${requestId}`);
      break;
    }

    default:
      console.log(`Stripe webhook: unhandled event type ${event.type}`);
  }

  return { received: true };
};
