import jwt from "jsonwebtoken";
import { envConfig } from "../config/env";
import { AppError } from "./AppError";

export interface JwtPayload {
  userId: string;
  role: string;
}

export const generateAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, envConfig.jwt.secret, {
    expiresIn: envConfig.jwt.expiresIn as jwt.SignOptions["expiresIn"],
  });

export const generateRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload, envConfig.jwt.refreshSecret, {
    expiresIn: envConfig.jwt.refreshExpiresIn as jwt.SignOptions["expiresIn"],
  });

export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, envConfig.jwt.secret) as JwtPayload;
  } catch {
    throw new AppError("Invalid or expired access token", 401);
  }
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, envConfig.jwt.refreshSecret) as JwtPayload;
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }
};
