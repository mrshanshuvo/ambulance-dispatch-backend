import type { Prisma } from "@prisma/client";
import { prisma } from "../config/db";

export const logAudit = async (
  actorId: string | undefined,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
) => {
  if (!actorId) return;
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType,
        entityId,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (error) {
    console.error("Audit log error:", error);
  }
};
