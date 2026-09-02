import type { Request, Response } from "express";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import * as userService from "./user.service";

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Unauthorized", 401);
  }
  const user = await userService.getMe(req.user.userId);
  sendSuccess(res, "Profile fetched successfully", user);
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    throw new AppError("Unauthorized", 401);
  }
  const user = await userService.updateMe(req.user.userId, req.body);
  sendSuccess(res, "Profile updated successfully", user);
});
