import { describe, expect, it } from "vitest";
import {
  loginSchema,
  registerSchema,
} from "../../../src/modules/auth/auth.validator";

describe("Auth Validator Schemas", () => {
  describe("registerSchema", () => {
    it("should accept valid registration input with strong password", () => {
      const validData = {
        body: {
          name: "Test User",
          email: "user@example.com",
          password: "Password123",
          phone: "+8801712345678",
          address: "Dhaka, Bangladesh",
        },
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject passwords missing uppercase or number", () => {
      const invalidData = {
        body: {
          name: "Test User",
          email: "user@example.com",
          password: "password",
        },
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject invalid email format", () => {
      const invalidData = {
        body: {
          name: "Test User",
          email: "not-an-email",
          password: "Password123",
        },
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe("loginSchema", () => {
    it("should validate valid login credentials", () => {
      const validData = {
        body: {
          email: "user@example.com",
          password: "secretPassword",
        },
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("should reject empty password on login", () => {
      const invalidData = {
        body: {
          email: "user@example.com",
          password: "",
        },
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
