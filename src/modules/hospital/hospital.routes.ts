import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { logAudit } from "../../utils/auditLogger";
import { sendSuccess } from "../../utils/response";
import * as hospitalService from "./hospital.service";
import {
  createHospitalSchema,
  listHospitalSchema,
  updateHospitalSchema,
} from "./hospital.validator";

const router = Router();

// GET /api/v1/hospitals — Public
router.get(
  "/",
  validate(listHospitalSchema),
  asyncHandler(async (req, res) => {
    const result = await hospitalService.listHospitals(req);
    sendSuccess(res, "Hospitals fetched successfully", result);
  }),
);

// GET /api/v1/hospitals/:id — Public
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const hospital = await hospitalService.getHospitalById(req.params.id);
    sendSuccess(res, "Hospital fetched successfully", hospital);
  }),
);

// POST /api/v1/hospitals — ADMIN only
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createHospitalSchema),
  asyncHandler(async (req, res) => {
    const hospital = await hospitalService.createHospital(req.body);
    await logAudit(req.user?.userId, "CREATE", "Hospital", hospital.id);
    sendSuccess(res, "Hospital created successfully", hospital, 201);
  }),
);

// PATCH /api/v1/hospitals/:id — ADMIN only
router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(updateHospitalSchema),
  asyncHandler(async (req, res) => {
    const hospital = await hospitalService.updateHospital(
      req.params.id,
      req.body,
    );
    await logAudit(
      req.user?.userId,
      "UPDATE",
      "Hospital",
      hospital.id,
      req.body,
    );
    sendSuccess(res, "Hospital updated successfully", hospital);
  }),
);

// DELETE /api/v1/hospitals/:id — ADMIN only
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  asyncHandler(async (req, res) => {
    await hospitalService.softDeleteHospital(req.params.id);
    await logAudit(req.user?.userId, "DELETE", "Hospital", req.params.id);
    sendSuccess(res, "Hospital deleted successfully", null);
  }),
);

export default router;
