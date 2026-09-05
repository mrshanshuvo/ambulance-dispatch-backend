import bcrypt from "bcrypt";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import type { CreateAdminDriverInput } from "./admin.validator";

export const createDriverByAdmin = async (data: CreateAdminDriverInput) => {
  // 1. Check duplicate email
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existingUser) {
    throw new AppError("Email already in use", 409);
  }

  // 2. Check duplicate license number
  const existingLicense = await prisma.driver.findUnique({
    where: { licenseNumber: data.licenseNumber },
  });
  if (existingLicense) {
    throw new AppError("A driver with this license number already exists", 409);
  }

  // 3. Check ambulance if provided
  if (data.ambulanceId) {
    const ambulance = await prisma.ambulance.findFirst({
      where: { id: data.ambulanceId, deletedAt: null },
    });
    if (!ambulance) {
      throw new AppError("Ambulance not found", 404);
    }
  }

  // 4. Hash password
  const passwordHash = await bcrypt.hash(data.password, 12);

  // 5. Atomic transaction: create User (DRIVER) + Driver profile
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        phone: data.phone,
        role: "DRIVER",
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

    const driver = await tx.driver.create({
      data: {
        userId: user.id,
        licenseNumber: data.licenseNumber,
        ambulanceId: data.ambulanceId || null,
        isAvailable: true,
      },
      include: {
        ambulance: {
          select: {
            id: true,
            vehicleNumber: true,
            type: true,
            status: true,
          },
        },
      },
    });

    return {
      user,
      driver,
    };
  });
};
