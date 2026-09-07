# 🗓️ Day 4 Execution Plan — Payment Integration (Stripe) & README

**Date:** September 03, 2026 | **Target Duration:** ~2-3 hours

---

## ✅ Day 1, 2 & 3 Completed

- [x] Project setup, Express + TypeScript + Prisma 7.10 + Biome
- [x] 9-entity Prisma schema on Neon PostgreSQL
- [x] JWT Auth (Register/Login/Refresh/Logout), Google OAuth 2.0
- [x] 23 business logic APIs: Ambulance, Driver, Hospital, Emergency Request, Dispatch, Admin
- [x] Audit logging, soft deletes, pagination on all list endpoints
- [x] Deployed live on Render with auto-deploy from GitHub main

---

## 📋 Day 4 Deliverables

| Module | APIs | Roles |
| :------ | :---- | :---- |
| **Payment** | `POST /payments/checkout`, `GET /payments/:requestId`, `POST /payments/webhook` | PATIENT, ADMIN, Stripe |
| **README** | Comprehensive documentation | — |

**Total new endpoints:** 3 (total project: 26+ endpoints) ✅

---

## 🔴 Step 1 — Install Stripe SDK (2 min)

```bash
npm install stripe
```

The Stripe SDK includes its own TypeScript types — no `@types/stripe` needed.

**📝 Commit #24:**

```
chore: install stripe SDK for payment integration
```

---

## 🔴 Step 2 — Stripe Config Singleton

### `src/config/stripe.ts`

```ts
import Stripe from "stripe";
import { envConfig } from "./env";

if (!envConfig.stripe.secretKey) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}

export const stripe = new Stripe(envConfig.stripe.secretKey, {
  apiVersion: "2026-08-26.dahlia",
});
```

> Uses the `envConfig.stripe.secretKey` already wired in `env.ts`. The API version must match exactly what the installed SDK version supports.

**📝 Commit #25:**

```
feat(config): add Stripe SDK singleton
```

---

## 🔴 Step 3 — Payment Validator

### `src/modules/payment/payment.validator.ts`

```ts
import { z } from "zod";

export const createCheckoutSchema = z.object({
  body: z.object({
    requestId: z.string().uuid("Must be a valid request ID"),
    amount: z
      .number()
      .positive("Amount must be positive")
      .min(10, "Minimum amount is 10 BDT"),
    currency: z.string().default("bdt"),
  }),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>["body"];
```

---

## 🔴 Step 4 — Payment Service

### `src/modules/payment/payment.service.ts`

Three exported functions:

#### `createCheckoutSession(callerId, data)`

Business rules enforced before creating Stripe session:

1. ✅ Validate request exists and belongs to the calling patient
2. ✅ Block double-payment: reject if `payment.status === "SUCCESS"` already exists
3. ✅ Only allow payment for `DISPATCHED` or `COMPLETED` requests
4. Create Stripe Checkout Session via `stripe.checkout.sessions.create()`
5. Upsert a `Payment` DB record with status `PENDING` and the session ID

**Important:** Stripe amounts are in the **smallest currency unit**.
For BDT: `1500 BDT = 150000 paisa` (× 100).

```ts
const amountInPaisa = Math.round(data.amount * 100);
```

Returns: `{ sessionId, checkoutUrl, payment }`

#### `getPaymentByRequestId(requestId, callerId, role)`

- Only the owning patient or ADMIN can fetch payment status
- Throws 404 if no payment record found

#### `handleStripeWebhook(rawBody, signature, webhookSecret)`

Handles these Stripe events:

| Event | Action |
| :---- | :----- |
| `checkout.session.completed` | Mark payment `SUCCESS`, set `gatewayTxnId`, move request to `COMPLETED` |
| `checkout.session.expired` | Mark payment `FAILED` |
| `payment_intent.payment_failed` | Mark payment `FAILED`, set `gatewayTxnId` |

Uses `stripe.webhooks.constructEvent()` to verify the signature — rejects unsigned requests with 400.

---

## 🔴 Step 5 — Payment Controller & Routes

### `src/modules/payment/payment.routes.ts`

```ts
// POST /api/v1/payments/webhook — raw body (no JSON parsing)
router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// POST /api/v1/payments/checkout — PATIENT only
router.post("/checkout", authenticate, authorize("PATIENT"), validate(createCheckoutSchema), createCheckout);

// GET /api/v1/payments/:requestId — PATIENT or ADMIN
router.get("/:requestId", authenticate, authorize("PATIENT", "ADMIN"), getPaymentStatus);
```

### ⚠️ Critical: Webhook Raw Body

The Stripe webhook endpoint **must receive the raw Buffer**, not the JSON-parsed body. This requires:

1. Applying `express.raw({ type: "application/json" })` **locally on the webhook route**
2. Mounting payment routes **BEFORE** `express.json()` in `app.ts`

```ts
// app.ts — ORDER MATTERS
app.use("/api/v1/payments", paymentRoutes);  // ← BEFORE express.json()
app.use(express.json());                      // ← All other routes get JSON parsing
```

**📝 Commit #26:**

```
feat(payment): add Stripe checkout, payment status, and webhook handler
```

---

## 🔴 Step 6 — Mount in `app.ts`

```ts
import paymentRoutes from "./modules/payment/payment.routes";

// ── BEFORE express.json() ──────────────────────────────
app.use("/api/v1/payments", paymentRoutes);

// Body parsing (all other routes)
app.use(express.json());
```

---

## 🔴 Step 7 — Build, Lint & Verify

```bash
npm run lint:fix
npm run build
```

Expected: Prisma client generated ✔ + 0 TypeScript errors.

---

## 🔴 Step 8 — Update Postman Collection

Add `09. Payment Module` folder to [`docs/postman_collection.json`](./docs/postman_collection.json) with:

| Request | Method | Description |
| :------ | :----- | :---------- |
| Create Checkout Session | `POST /payments/checkout` | Auto-saves `paymentSessionId` and logs `checkoutUrl` to console |
| Get Payment Status | `GET /payments/:requestId` | Returns `PENDING/SUCCESS/FAILED/REFUNDED` |
| Stripe Webhook (Simulate) | `POST /payments/webhook` | Documents local CLI usage |

**📝 Commit #27:**

```
docs: add Payment module to Postman collection with Stripe checkout and webhook tests
```

---

## 🔴 Step 9 — Write README.md

Comprehensive [`README.md`](./README.md) at repo root covering:

- Live URLs + badge strip
- Features list (15 items)
- Tech stack table
- Project directory structure
- Database ERD (ASCII)
- Full API reference (26 endpoints across 9 modules)
- Local setup (6 steps)
- All environment variables annotated
- Postman testing guide + recommended test flow
- Stripe payment flow diagram
- All `npm run` scripts
- RBAC permission matrix (16 rows × 3 roles)
- Deployment instructions (Render)

**📝 Commit #28:**

```
docs: add comprehensive README with API reference, setup guide, and RBAC matrix
```

---

## 🧪 How to Test Stripe Webhooks Locally

```bash
# 1. Start dev server
npm run dev

# 2. Forward webhooks to localhost (Stripe CLI)
stripe listen --forward-to localhost:5000/api/v1/payments/webhook

# 3. Trigger a test event in another terminal
stripe trigger checkout.session.completed
```

Test card: **4242 4242 4242 4242**, any future expiry, any CVV, any billing address.

---

## 💳 End-to-End Payment Flow

```
PATIENT  → POST /api/v1/payments/checkout
                  ↓
           Stripe Checkout Page  (hosted by Stripe)
                  ↓ (enter test card 4242...)
Stripe   → POST /api/v1/payments/webhook
           event: checkout.session.completed
                  ↓
           Payment.status = SUCCESS
           EmergencyRequest.status = COMPLETED
```

---

## 📊 Day 4 Git Commit Summary

| # | Commit Message | After Step |
| --- | -------------- | ---------- |
| 24 | `chore: install stripe SDK for payment integration` | Step 1 |
| 25 | `feat(config): add Stripe SDK singleton` | Step 2 |
| 26 | `feat(payment): add Stripe checkout, payment status, and webhook handler` | Steps 3-6 |
| 27 | `docs: add Payment module to Postman collection with Stripe checkout and webhook tests` | Step 8 |
| 28 | `docs: add comprehensive README with API reference, setup guide, and RBAC matrix` | Step 9 |

---

## ✅ Day 4 Done Checklist

- [x] `stripe` npm package installed
- [x] `src/config/stripe.ts` singleton created with correct API version
- [x] **Payment Validator**: `createCheckoutSchema` with Zod
- [x] **Payment Service**: `createCheckoutSession`, `getPaymentByRequestId`, `handleStripeWebhook`
- [x] **Payment Routes**: 3 endpoints — checkout, status, webhook
- [x] Webhook endpoint uses `express.raw()` locally (raw Buffer preserved)
- [x] Payment routes mounted **before** `express.json()` in `app.ts`
- [x] Business rules enforced: no double-payment, only dispatched/completed requests
- [x] Webhook handles: `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`
- [x] Stripe signature verification on every webhook call
- [x] Postman collection updated with `09. Payment Module` folder
- [x] `npm run build` passing with 0 TypeScript errors
- [x] Biome lint clean
- [x] 5 semantic Git commits pushed to GitHub
- [x] README.md written with full API reference and RBAC matrix
- [x] Render auto-deploy triggered and live
