import express, { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import * as paymentController from "./payment.controller";
import {
  createBkashCheckoutSchema,
  createCheckoutSchema,
  executeBkashSchema,
} from "./payment.validator";

const router = Router();

// POST /api/v1/payments/webhook — Stripe webhook (raw body, no auth)
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.stripeWebhook,
);

// POST /api/v1/payments/checkout — Patient initiates Stripe checkout
router.post(
  "/checkout",
  authenticate,
  authorize("PATIENT"),
  validate(createCheckoutSchema),
  paymentController.createCheckout,
);

// POST /api/v1/payments/bkash/create — Patient creates bKash payment URL
router.post(
  "/bkash/create",
  authenticate,
  authorize("PATIENT"),
  validate(createBkashCheckoutSchema),
  paymentController.createBkashCheckout,
);

// POST /api/v1/payments/bkash/execute — Patient executes/captures bKash payment
router.post(
  "/bkash/execute",
  authenticate,
  authorize("PATIENT"),
  validate(executeBkashSchema),
  paymentController.executeBkash,
);

// GET /api/v1/payments/:requestId — Patient or Admin views payment status
router.get(
  "/:requestId",
  authenticate,
  authorize("PATIENT", "ADMIN"),
  paymentController.getPaymentStatus,
);

export default router;
