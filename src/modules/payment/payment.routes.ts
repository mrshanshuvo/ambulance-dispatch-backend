import express, { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import * as paymentController from "./payment.controller";
import {
  createBkashCheckoutSchema,
  createCheckoutSchema,
  executeBkashSchema,
  getFareSchema,
  initSSLCommerzSchema,
} from "./payment.validator";

const router = Router();

// POST /api/v1/payments/stripe/webhook (or /webhook) — Stripe webhook (raw body, no auth)
router.post(
  ["/stripe/webhook", "/webhook"],
  express.raw({ type: "application/json" }),
  paymentController.stripeWebhook,
);

// POST /api/v1/payments/stripe/checkout (or /checkout) — Patient initiates Stripe checkout
router.post(
  ["/stripe/checkout", "/checkout"],
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

// POST /api/v1/payments/sslcommerz/initiate — Patient initializes SSLCommerz payment
router.post(
  "/sslcommerz/initiate",
  authenticate,
  authorize("PATIENT"),
  validate(initSSLCommerzSchema),
  paymentController.initSSLCommerz,
);

// POST /api/v1/payments/sslcommerz/success — SSLCommerz browser return (success)
router.post("/sslcommerz/success", paymentController.sslcommerzSuccess);

// POST /api/v1/payments/sslcommerz/fail — SSLCommerz browser return (fail)
router.post("/sslcommerz/fail", paymentController.sslcommerzFail);

// POST /api/v1/payments/sslcommerz/cancel — SSLCommerz browser return (cancel)
router.post("/sslcommerz/cancel", paymentController.sslcommerzCancel);

// POST /api/v1/payments/sslcommerz/ipn — SSLCommerz IPN webhook
router.post("/sslcommerz/ipn", paymentController.sslcommerzIPN);

// GET /api/v1/payments/fare/:requestId — Patient or Admin views calculated fare estimate
router.get(
  "/fare/:requestId",
  authenticate,
  authorize("PATIENT", "ADMIN"),
  validate(getFareSchema),
  paymentController.getFareEstimate,
);

// GET /api/v1/payments/:requestId — Patient or Admin views payment status
router.get(
  "/:requestId",
  authenticate,
  authorize("PATIENT", "ADMIN"),
  paymentController.getPaymentStatus,
);

export default router;
