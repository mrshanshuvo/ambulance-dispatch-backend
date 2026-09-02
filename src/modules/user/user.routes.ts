import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import * as userController from "./user.controller";
import { updateMeSchema } from "./user.validator";

const router = Router();

// All user routes require authentication
router.use(authenticate);

// GET /api/v1/users/me
router.get("/me", userController.getMe);

// PATCH /api/v1/users/me
router.patch("/me", validate(updateMeSchema), userController.updateMe);

export default router;
