import bcrypt from "bcrypt";
import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../src/app";
import { prisma } from "../../src/config/db";

describe("Payment Integration Tests (Stripe & bKash)", () => {
  const timestamp = Date.now();
  let patientToken = "";
  let requestId = "";

  it("Setup: Create Patient and Dispatched Emergency Request", async () => {
    // 1. Create Patient User
    const passwordHash = await bcrypt.hash("Password123", 12);
    const patientUser = await prisma.user.create({
      data: {
        name: `Payment Test Patient ${timestamp}`,
        email: `pay_patient_${timestamp}@example.com`,
        passwordHash,
        role: "PATIENT",
      },
    });

    const loginRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: patientUser.email, password: "Password123" });
    patientToken = loginRes.body.data.accessToken;
    expect(patientToken).toBeDefined();

    // 2. Create and mark Emergency Request as DISPATCHED
    const req = await prisma.emergencyRequest.create({
      data: {
        callerId: patientUser.id,
        pickupAddress: "Banani, Road 11, Dhaka",
        priority: "HIGH",
        status: "DISPATCHED",
      },
    });
    requestId = req.id;
    expect(requestId).toBeDefined();
  });

  describe("Stripe Gateway Integration", () => {
    it("POST /api/v1/payments/checkout should create a Stripe session", async () => {
      const res = await request(app)
        .post("/api/v1/payments/checkout")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          requestId,
          amount: 2000,
          currency: "bdt",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.checkoutUrl).toBeDefined();
      expect(res.body.data.payment.gateway).toBe("STRIPE");
      expect(res.body.data.payment.status).toBe("PENDING");
    });

    it("POST /api/v1/payments/webhook should handle checkout.session.completed", async () => {
      const res = await request(app)
        .post("/api/v1/payments/webhook")
        .set("stripe-signature", "valid_mock_signature")
        .send({
          type: "checkout.session.completed",
        });

      expect(res.status).toBe(200);
      expect(res.body.received).toBe(true);
    });
  });

  describe("bKash Gateway Integration", () => {
    let bkashPaymentID = "";
    let bkashRequestId = "";

    it("Setup: Create another dispatched request for bKash", async () => {
      const user = await prisma.user.findFirst({
        where: { email: `pay_patient_${timestamp}@example.com` },
      });
      const req = await prisma.emergencyRequest.create({
        data: {
          callerId: user!.id,
          pickupAddress: "Gulshan 1, Dhaka",
          priority: "CRITICAL",
          status: "DISPATCHED",
        },
      });
      bkashRequestId = req.id;
    });

    it("POST /api/v1/payments/bkash/create should generate bKash payment URL", async () => {
      const res = await request(app)
        .post("/api/v1/payments/bkash/create")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          requestId: bkashRequestId,
          amount: 1800,
          payerReference: "01770618575",
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bkashURL).toBeDefined();
      expect(res.body.data.paymentID).toBeDefined();
      expect(res.body.data.payment.gateway).toBe("BKASH");
      expect(res.body.data.payment.status).toBe("PENDING");
      bkashPaymentID = res.body.data.paymentID;
    });

    it("POST /api/v1/payments/bkash/execute should capture payment and complete request", async () => {
      const res = await request(app)
        .post("/api/v1/payments/bkash/execute")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          paymentID: bkashPaymentID,
          requestId: bkashRequestId,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trxID).toBeDefined();
      expect(res.body.data.status).toBe("SUCCESS");

      // Verify request transitioned to COMPLETED
      const reqCheck = await prisma.emergencyRequest.findUnique({
        where: { id: bkashRequestId },
      });
      expect(reqCheck?.status).toBe("COMPLETED");
    });
  });

  describe("SSLCommerz Gateway Integration", () => {
    let sslRequestId = "";

    it("Setup: Create dispatched request for SSLCommerz", async () => {
      const user = await prisma.user.findFirst({
        where: { email: `pay_patient_${timestamp}@example.com` },
      });
      const req = await prisma.emergencyRequest.create({
        data: {
          callerId: user!.id,
          pickupAddress: "Uttara Sector 7, Dhaka",
          priority: "HIGH",
          status: "DISPATCHED",
        },
      });
      sslRequestId = req.id;
    });

    it("POST /api/v1/payments/sslcommerz/initiate should generate hosted gateway URL", async () => {
      const res = await request(app)
        .post("/api/v1/payments/sslcommerz/initiate")
        .set("Authorization", `Bearer ${patientToken}`)
        .send({
          requestId: sslRequestId,
          amount: 2200,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.gatewayPageURL).toBeDefined();
      expect(res.body.data.sessionkey).toBeDefined();
      expect(res.body.data.payment.gateway).toBe("SSLCOMMERZ");
      expect(res.body.data.payment.status).toBe("PENDING");
    });

    it("POST /api/v1/payments/sslcommerz/success should validate payment and mark completed", async () => {
      const res = await request(app)
        .post(`/api/v1/payments/sslcommerz/success?requestId=${sslRequestId}`)
        .send({
          val_id: "VALIDATION_MOCK_123456",
          status: "VALID",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.tranId).toBeDefined();
      expect(res.body.data.status).toBe("SUCCESS");

      const reqCheck = await prisma.emergencyRequest.findUnique({
        where: { id: sslRequestId },
      });
      expect(reqCheck?.status).toBe("COMPLETED");
    });
  });
});
