import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import * as authController from "./auth.controller";
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from "./auth.validator";

const router = Router();

// POST /api/v1/auth/register
router.post("/register", validate(registerSchema), authController.register);

// POST /api/v1/auth/login
router.post("/login", validate(loginSchema), authController.login);

// POST /api/v1/auth/logout — requires auth
router.post("/logout", authenticate, authController.logout);

// POST /api/v1/auth/refresh-token
router.post(
  "/refresh-token",
  validate(refreshTokenSchema),
  authController.refreshToken,
);

export default router;
