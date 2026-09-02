import { Router } from "express";
import passport from "passport";
import "../../config/passport";
import { authenticate } from "../../middlewares/auth.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { generateAccessToken, generateRefreshToken } from "../../utils/jwt";
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

// GET /api/v1/auth/google
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    session: false,
  }),
);

// GET /api/v1/auth/google/callback
router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/api/v1/auth/google/failure",
    session: false,
  }),
  (req, res) => {
    const user = req.user as { id: string; role: string };
    const accessToken = generateAccessToken({
      userId: user.id,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({
      userId: user.id,
      role: user.role,
    });

    res.json({
      success: true,
      message: "Google login successful",
      data: { accessToken, refreshToken },
    });
  },
);

// GET /api/v1/auth/google/failure
router.get("/google/failure", (_req, res) => {
  res.status(401).json({
    success: false,
    message: "Google authentication failed",
    errors: [],
  });
});

export default router;
