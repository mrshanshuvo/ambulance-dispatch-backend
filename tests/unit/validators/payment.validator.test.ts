import { describe, expect, it } from "vitest";
import { createCheckoutSchema } from "../../../src/modules/payment/payment.validator";

describe("Payment Validator Schemas", () => {
  it("should validate valid checkout input payload", () => {
    const validBody = {
      body: {
        requestId: "123e4567-e89b-12d3-a456-426614174000",
        amount: 1500,
        currency: "bdt",
      },
    };

    const parsed = createCheckoutSchema.safeParse(validBody);
    expect(parsed.success).toBe(true);
  });

  it("should reject invalid UUID requestId", () => {
    const invalidBody = {
      body: {
        requestId: "not-a-valid-uuid",
        amount: 500,
      },
    };

    const parsed = createCheckoutSchema.safeParse(invalidBody);
    expect(parsed.success).toBe(false);
  });

  it("should reject amounts below minimum 10 BDT", () => {
    const invalidBody = {
      body: {
        requestId: "123e4567-e89b-12d3-a456-426614174000",
        amount: 5,
      },
    };

    const parsed = createCheckoutSchema.safeParse(invalidBody);
    expect(parsed.success).toBe(false);
  });
});
