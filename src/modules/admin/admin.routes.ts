import { Router } from "express";
import { prisma } from "../../config/db";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { AppError } from "../../utils/AppError";
import { asyncHandler } from "../../utils/asyncHandler";
import { logAudit } from "../../utils/auditLogger";
import { buildMeta, getPagination } from "../../utils/pagination";
import { sendSuccess } from "../../utils/response";
import * as adminService from "./admin.service";
import { createAdminDriverSchema } from "./admin.validator";

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, authorize("ADMIN"));

// POST /api/v1/admin/drivers — Direct driver onboarding by Admin
router.post(
  "/drivers",
  validate(createAdminDriverSchema),
  asyncHandler(async (req, res) => {
    const result = await adminService.createDriverByAdmin(req.body);
    await logAudit(req.user?.userId, "CREATE", "Driver", result.id, {
      email: result.user.email,
      licenseNumber: result.licenseNumber,
    });
    sendSuccess(res, "Driver created successfully", result, 201);
  }),
);

// GET /api/v1/admin/users — List all users with pagination + search
router.get(
  "/users",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const { search, role } = req.query as { search?: string; role?: string };

    const where = {
      deletedAt: null,
      ...(role && { role: role as never }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(res, "Users fetched successfully", {
      users,
      meta: buildMeta(page, limit, total),
    });
  }),
);

// PATCH /api/v1/admin/users/:id/role — Update user role
router.patch(
  "/users/:id/role",
  asyncHandler(async (req, res) => {
    const { role } = req.body;
    if (!["PATIENT", "DRIVER", "ADMIN"].includes(role)) {
      throw new AppError("Invalid role", 400);
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    await logAudit(req.user?.userId, "UPDATE_ROLE", "User", user.id, {
      newRole: role,
    });
    sendSuccess(res, "User role updated successfully", user);
  }),
);

// DELETE /api/v1/admin/users/:id — Soft delete user
router.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    if (req.params.id === req.user?.userId) {
      throw new AppError("You cannot delete your own account", 400);
    }
    await prisma.user.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await logAudit(req.user?.userId, "DELETE", "User", req.params.id);
    sendSuccess(res, "User deleted successfully", null);
  }),
);

// GET /api/v1/admin/audit-logs — View audit trail
router.get(
  "/audit-logs",
  asyncHandler(async (req, res) => {
    const { page, limit, skip } = getPagination(req);
    const { entityType } = req.query as { entityType?: string };

    const where = { ...(entityType && { entityType }) };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          actor: { select: { name: true, email: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    sendSuccess(res, "Audit logs fetched successfully", {
      logs,
      meta: buildMeta(page, limit, total),
    });
  }),
);

// GET /api/v1/admin/stats — Dashboard summary statistics
router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    const [
      totalUsers,
      totalDrivers,
      totalAmbulances,
      availableAmbulances,
      dispatchedAmbulances,
      totalRequests,
      pendingRequests,
      completedRequests,
      totalRevenueResult,
    ] = await Promise.all([
      prisma.user.count({ where: { deletedAt: null } }),
      prisma.driver.count({ where: { deletedAt: null } }),
      prisma.ambulance.count({ where: { deletedAt: null } }),
      prisma.ambulance.count({
        where: { deletedAt: null, status: "AVAILABLE" },
      }),
      prisma.ambulance.count({
        where: { deletedAt: null, status: "DISPATCHED" },
      }),
      prisma.emergencyRequest.count({ where: { deletedAt: null } }),
      prisma.emergencyRequest.count({
        where: { deletedAt: null, status: "PENDING" },
      }),
      prisma.emergencyRequest.count({
        where: { deletedAt: null, status: "COMPLETED" },
      }),
      prisma.payment.aggregate({
        where: { status: "SUCCESS" },
        _sum: { amount: true },
      }),
    ]);

    const stats = {
      users: {
        total: totalUsers,
        drivers: totalDrivers,
      },
      ambulances: {
        total: totalAmbulances,
        available: availableAmbulances,
        dispatched: dispatchedAmbulances,
        maintenance:
          totalAmbulances - (availableAmbulances + dispatchedAmbulances),
      },
      requests: {
        total: totalRequests,
        pending: pendingRequests,
        completed: completedRequests,
      },
      payments: {
        totalRevenue: totalRevenueResult._sum.amount || 0,
        currency: "BDT",
      },
    };

    sendSuccess(res, "Admin stats fetched successfully", stats);
  }),
);

export default router;
