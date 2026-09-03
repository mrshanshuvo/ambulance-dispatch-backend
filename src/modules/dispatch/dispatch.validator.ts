import { z } from "zod";

export const createDispatchSchema = z.object({
  body: z.object({
    requestId: z.string().uuid("Invalid request ID"),
    ambulanceId: z.string().uuid("Invalid ambulance ID"),
    driverId: z.string().uuid("Invalid driver ID"),
    hospitalId: z.string().uuid().optional(),
  }),
});

export const updateDispatchStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      "DISPATCHED",
      "EN_ROUTE",
      "PATIENT_PICKUP",
      "HOSPITAL_SELECTED",
      "HOSPITAL_ARRIVAL",
      "COMPLETED",
    ]),
    note: z.string().optional(),
    hospitalId: z.string().uuid().optional(),
  }),
});

export type CreateDispatchInput = z.infer<typeof createDispatchSchema>["body"];
export type UpdateDispatchStatusInput = z.infer<
  typeof updateDispatchStatusSchema
>["body"];
