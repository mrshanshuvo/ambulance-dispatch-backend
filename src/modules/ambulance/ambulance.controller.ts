import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { logAudit } from "../../utils/auditLogger";
import { sendSuccess } from "../../utils/response";
import * as ambulanceService from "./ambulance.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const ambulance = await ambulanceService.createAmbulance(req.body);
  await logAudit(req.user!.userId, "CREATE", "Ambulance", ambulance.id);
  sendSuccess(res, "Ambulance created successfully", ambulance, 201);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await ambulanceService.listAmbulances(req);
  sendSuccess(res, "Ambulances fetched successfully", result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const ambulance = await ambulanceService.getAmbulanceById(req.params.id);
  sendSuccess(res, "Ambulance fetched successfully", ambulance);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const ambulance = await ambulanceService.updateAmbulance(
    req.params.id,
    req.body,
  );
  await logAudit(
    req.user!.userId,
    "UPDATE",
    "Ambulance",
    ambulance.id,
    req.body,
  );
  sendSuccess(res, "Ambulance updated successfully", ambulance);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await ambulanceService.softDeleteAmbulance(req.params.id);
  await logAudit(req.user!.userId, "DELETE", "Ambulance", req.params.id);
  sendSuccess(res, "Ambulance deleted successfully", null);
});
