import bcrypt from "bcrypt";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../../utils/jwt";
import type { LoginInput, RegisterInput } from "./auth.validator";

export const register = async (data: RegisterInput) => {
  // 1. Check duplicate email
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) {
    throw new AppError("Email already in use", 409);
  }

  // 2. Hash password
  const passwordHash = await bcrypt.hash(data.password, 12);

  // 3. Create user
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      phone: data.phone,
      address: data.address,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      createdAt: true,
    },
  });

  // 4. Generate tokens
  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  const refreshToken = generateRefreshToken({
    userId: user.id,
    role: user.role,
  });

  return { user, accessToken, refreshToken };
};

export const login = async (data: LoginInput) => {
  // 1. Find user
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !user.passwordHash) {
    throw new AppError("Invalid email or password", 401);
  }

  // 2. Check if account is active
  if (!user.isActive) {
    throw new AppError("Your account has been deactivated", 403);
  }

  // 3. Verify password
  const isMatch = await bcrypt.compare(data.password, user.passwordHash);
  if (!isMatch) {
    throw new AppError("Invalid email or password", 401);
  }

  // 4. Generate tokens
  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  const refreshToken = generateRefreshToken({
    userId: user.id,
    role: user.role,
  });

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    createdAt: user.createdAt,
  };

  return { user: safeUser, accessToken, refreshToken };
};

export const refreshAccessToken = async (token: string) => {
  // 1. Verify refresh token
  const payload = verifyRefreshToken(token);

  // 2. Confirm user still exists and is active
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive) {
    throw new AppError("User not found or deactivated", 401);
  }

  // 3. Issue new access token
  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  return { accessToken };
};
