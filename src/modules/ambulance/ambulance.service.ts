import type { Request } from "express";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import { buildMeta, getPagination } from "../../utils/pagination";
import type {
  CreateAmbulanceInput,
  UpdateAmbulanceInput,
} from "./ambulance.validator";

export const createAmbulance = async (data: CreateAmbulanceInput) => {
  const existing = await prisma.ambulance.findUnique({
    where: { vehicleNumber: data.vehicleNumber },
  });
  if (existing) throw new AppError("Vehicle number already registered", 409);

  return prisma.ambulance.create({ data });
};

export const listAmbulances = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { status, type } = req.query as { status?: string; type?: string };

  const where = {
    deletedAt: null,
    ...(status && { status: status as never }),
    ...(type && { type: type as never }),
  };

  const [ambulances, total] = await Promise.all([
    prisma.ambulance.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        driver: { include: { user: { select: { name: true, phone: true } } } },
      },
    }),
    prisma.ambulance.count({ where }),
  ]);

  return { ambulances, meta: buildMeta(page, limit, total) };
};

export const getAmbulanceById = async (id: string) => {
  const ambulance = await prisma.ambulance.findFirst({
    where: { id, deletedAt: null },
    include: {
      driver: {
        include: { user: { select: { name: true, email: true, phone: true } } },
      },
    },
  });
  if (!ambulance) throw new AppError("Ambulance not found", 404);
  return ambulance;
};

export const updateAmbulance = async (
  id: string,
  data: UpdateAmbulanceInput,
) => {
  await getAmbulanceById(id);
  return prisma.ambulance.update({ where: { id }, data });
};

export const softDeleteAmbulance = async (id: string) => {
  await getAmbulanceById(id);
  return prisma.ambulance.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};
