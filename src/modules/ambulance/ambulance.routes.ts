import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import * as ctrl from "./ambulance.controller";
import {
  createAmbulanceSchema,
  listAmbulanceSchema,
  updateAmbulanceSchema,
} from "./ambulance.validator";

const router = Router();

// GET /api/v1/ambulances — Public
router.get("/", validate(listAmbulanceSchema), ctrl.list);

// GET /api/v1/ambulances/:id — Public
router.get("/:id", ctrl.getById);

// POST /api/v1/ambulances — ADMIN only
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createAmbulanceSchema),
  ctrl.create,
);

// PATCH /api/v1/ambulances/:id — ADMIN only
router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(updateAmbulanceSchema),
  ctrl.update,
);

// DELETE /api/v1/ambulances/:id — ADMIN only
router.delete("/:id", authenticate, authorize("ADMIN"), ctrl.remove);

export default router;
