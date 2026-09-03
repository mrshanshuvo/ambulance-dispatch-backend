import type { Request, Response } from "express";
import { envConfig } from "../../config/env";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { logAudit } from "../../utils/auditLogger";
import { sendSuccess } from "../../utils/response";
import * as paymentService from "./payment.service";

// POST /api/v1/payments/checkout
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
      { sessionId: result.sessionId },
    );
    sendSuccess(res, "Checkout session created successfully", result, 201);
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

// POST /api/v1/payments/webhook — raw body required (no JSON parsing)
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
