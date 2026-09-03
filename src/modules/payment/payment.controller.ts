import type { Request, Response } from "express";
import { envConfig } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { logAudit } from "../../utils/auditLogger";
import { sendSuccess } from "../../utils/response";
import * as paymentService from "./payment.service";

// POST /api/v1/payments/checkout (Stripe)
export const createCheckout = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user?.userId) throw new AppError("Unauthorized", 401);
    const result = await paymentService.createCheckoutSession(
      req.user.userId,
      req.body,
    );
    await logAudit(
      req.user.userId,
      "CREATE_CHECKOUT",
      "Payment",
      result.payment.id,
      { sessionId: result.sessionId, gateway: "STRIPE" },
    );
    sendSuccess(res, "Checkout session created successfully", result, 201);
  },
);

// POST /api/v1/payments/bkash/create (bKash)
export const createBkashCheckout = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user?.userId) throw new AppError("Unauthorized", 401);
    const result = await paymentService.createBkashCheckout(
      req.user.userId,
      req.body,
    );
    await logAudit(
      req.user.userId,
      "CREATE_BKASH_CHECKOUT",
      "Payment",
      result.payment.id,
      { paymentID: result.paymentID, gateway: "BKASH" },
    );
    sendSuccess(res, "bKash checkout URL generated successfully", result, 201);
  },
);

// POST /api/v1/payments/bkash/execute (bKash)
export const executeBkash = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user?.userId) throw new AppError("Unauthorized", 401);
    const result = await paymentService.executeBkashPayment(
      req.user.userId,
      req.body,
    );
    await logAudit(
      req.user.userId,
      "EXECUTE_BKASH_PAYMENT",
      "Payment",
      result.payment.id,
      { trxID: result.trxID },
    );
    sendSuccess(res, "bKash payment executed successfully", result);
  },
);

// GET /api/v1/payments/:requestId
export const getPaymentStatus = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user?.userId || !req.user?.role)
      throw new AppError("Unauthorized", 401);
    const payment = await paymentService.getPaymentByRequestId(
      req.params.requestId,
      req.user.userId,
      req.user.role,
    );
    sendSuccess(res, "Payment status fetched successfully", payment);
  },
);

// POST /api/v1/payments/webhook (Stripe)
export const stripeWebhook = asyncHandler(
  async (req: Request, res: Response) => {
    const signature = req.headers["stripe-signature"];
    if (!signature || typeof signature !== "string") {
      throw new AppError("Missing stripe-signature header", 400);
    }
    const result = await paymentService.handleStripeWebhook(
      req.body as Buffer,
      signature,
      envConfig.stripe.webhookSecret,
    );
    res.json(result);
  },
);
