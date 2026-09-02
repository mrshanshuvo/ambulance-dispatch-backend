import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";

export const getMe = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user) throw new AppError("User not found", 404);
  return user;
};

export const updateMe = async (
  userId: string,
  data: { name?: string; phone?: string; address?: string },
) => {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      updatedAt: true,
    },
  });
  return user;
};
