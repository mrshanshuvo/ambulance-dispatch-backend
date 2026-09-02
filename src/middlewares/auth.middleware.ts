import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";
import { type JwtPayload, verifyAccessToken } from "../utils/jwt";

// Extend Express.User so Passport and custom auth middlewares share the same type definition
declare global {
  namespace Express {
    interface User {
      userId: string;
      role: string;
    }
  }
}

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(new AppError("Access token missing or malformed", 401));
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    next();
  } catch (error) {
    next(error);
  }
};
