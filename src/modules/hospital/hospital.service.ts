import type { Request } from "express";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import { buildMeta, getPagination } from "../../utils/pagination";
import type {
  CreateHospitalInput,
  UpdateHospitalInput,
} from "./hospital.validator";

export const createHospital = async (data: CreateHospitalInput) => {
  return prisma.hospital.create({ data });
};

export const listHospitals = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { name } = req.query as { name?: string };

  const where = {
    deletedAt: null,
    ...(name && {
      name: { contains: name, mode: "insensitive" as const },
    }),
  };

  const [hospitals, total] = await Promise.all([
    prisma.hospital.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: "asc" },
    }),
    prisma.hospital.count({ where }),
  ]);

  return { hospitals, meta: buildMeta(page, limit, total) };
};

export const getHospitalById = async (id: string) => {
  const hospital = await prisma.hospital.findFirst({
    where: { id, deletedAt: null },
  });
  if (!hospital) throw new AppError("Hospital not found", 404);
  return hospital;
};

export const updateHospital = async (id: string, data: UpdateHospitalInput) => {
  await getHospitalById(id);
  return prisma.hospital.update({ where: { id }, data });
};

export const softDeleteHospital = async (id: string) => {
  await getHospitalById(id);
  return prisma.hospital.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};
