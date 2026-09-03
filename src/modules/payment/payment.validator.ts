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

export const createBkashCheckoutSchema = z.object({
  body: z.object({
    requestId: z.string().uuid("Must be a valid request ID"),
    amount: z
      .number()
      .positive("Amount must be positive")
      .min(10, "Minimum amount is 10 BDT"),
    payerReference: z.string().optional(),
  }),
});

export const executeBkashSchema = z.object({
  body: z.object({
    paymentID: z.string().min(1, "bKash paymentID is required"),
    requestId: z.string().uuid("Must be a valid request ID"),
  }),
});

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>["body"];
export type CreateBkashCheckoutInput = z.infer<
  typeof createBkashCheckoutSchema
>["body"];
export type ExecuteBkashInput = z.infer<typeof executeBkashSchema>["body"];
