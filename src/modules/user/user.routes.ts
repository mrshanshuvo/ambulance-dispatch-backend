import { Router } from "express";
import { uploadAvatar as multerUpload } from "../../config/multer";
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

// POST /api/v1/users/me/avatar — Upload profile picture via Multer → Cloudinary
router.post(
  "/me/avatar",
  multerUpload.single("avatar"),
  userController.uploadAvatar,
);

export default router;
