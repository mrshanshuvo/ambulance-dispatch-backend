import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

type Role = "PATIENT" | "DRIVER" | "ADMIN";

export const authorize =
  (...allowedRoles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Unauthorized — please log in", 401));
    }

    if (!allowedRoles.includes(req.user.role as Role)) {
      return next(
        new AppError(
          `Access denied — requires one of: ${allowedRoles.join(", ")}`,
          403,
        ),
      );
    }

    next();
  };
