import { z } from "zod";

export const updateMeSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
});

export type UpdateMeInput = z.infer<typeof updateMeSchema>["body"];
