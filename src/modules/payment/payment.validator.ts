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
