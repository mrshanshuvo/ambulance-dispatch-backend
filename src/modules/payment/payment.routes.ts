import express, { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import * as paymentController from "./payment.controller";
import { createCheckoutSchema } from "./payment.validator";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: The webhook route must use raw body parser — BEFORE express.json()
// is applied. This is mounted separately in app.ts at the top.
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/v1/payments/webhook — Stripe webhook (raw body, no auth)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.stripeWebhook,
);

// POST /api/v1/payments/checkout — Patient initiates payment
router.post(
  "/checkout",
  authenticate,
  authorize("PATIENT"),
  validate(createCheckoutSchema),
  paymentController.createCheckout,
);

// GET /api/v1/payments/:requestId — Patient or Admin views payment status
router.get(
  "/:requestId",
  authenticate,
  authorize("PATIENT", "ADMIN"),
  paymentController.getPaymentStatus,
);

export default router;
