import { describe, expect, it } from "vitest";
import {
  createBkashCheckoutSchema,
  executeBkashSchema,
} from "../../../src/modules/payment/payment.validator";

describe("bKash Validator Schemas", () => {
  describe("createBkashCheckoutSchema", () => {
    it("should accept valid bKash checkout payload", () => {
      const validData = {
        body: {
          requestId: "123e4567-e89b-12d3-a456-426614174000",
          amount: 1500,
          payerReference: "01770618575",
        },
      };

      const result = createBkashCheckoutSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject non-UUID requestId", () => {
      const invalidData = {
        body: {
          requestId: "invalid-uuid",
          amount: 1500,
        },
      };

      const result = createBkashCheckoutSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject amount less than 10 BDT", () => {
      const invalidData = {
        body: {
          requestId: "123e4567-e89b-12d3-a456-426614174000",
          amount: 5,
        },
      };

      const result = createBkashCheckoutSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("executeBkashSchema", () => {
    it("should accept valid paymentID and requestId", () => {
      const validData = {
        body: {
          paymentID: "TR0011gJ12345678",
          requestId: "123e4567-e89b-12d3-a456-426614174000",
        },
      };

      const result = executeBkashSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject empty paymentID", () => {
      const invalidData = {
        body: {
          paymentID: "",
          requestId: "123e4567-e89b-12d3-a456-426614174000",
        },
      };

      const result = executeBkashSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
