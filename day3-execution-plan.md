# 🗓️ Day 3 Execution Plan — Core Business Logic & 20+ APIs

**Date:** September 04, 2026 | **Target Duration:** ~6-8 hours

---

## ✅ Day 1 & Day 2 Completed (Foundation + Auth)
- [x] Project setup, TypeScript + Express + Biome + Prisma 7.10
- [x] 9-entity Prisma schema migrated to Neon PostgreSQL
- [x] JWT Auth (Register/Login/Refresh/Logout), Google OAuth 2.0 working
- [x] `authenticate` (JWT) + `authorize(roles)` (RBAC) middlewares wired up
- [x] Centralized `envConfig`, `sendSuccess`, `AppError`, `asyncHandler`
- [x] Deployed live on Render, pushing auto-deploys via GitHub

---

## 📋 Day 3 Deliverables

| Module | APIs | Roles |
| :----- | :--- | :---- |
| **Ambulance** | `POST /ambulances`, `GET /ambulances`, `GET /ambulances/:id`, `PATCH /ambulances/:id`, `DELETE /ambulances/:id` | ADMIN |
| **Driver** | `POST /drivers`, `GET /drivers`, `GET /drivers/me`, `PATCH /drivers/:id`, `DELETE /drivers/:id` | ADMIN, DRIVER |
| **Hospital** | `POST /hospitals`, `GET /hospitals`, `GET /hospitals/:id`, `PATCH /hospitals/:id`, `DELETE /hospitals/:id` | ADMIN, Public |
| **Emergency Request** | `POST /requests`, `GET /requests`, `GET /requests/:id`, `PATCH /requests/:id/cancel`, `GET /requests/my` | ALL ROLES |
| **Dispatch** | `POST /dispatches`, `GET /dispatches/:id`, `PATCH /dispatches/:id/status` | ADMIN, DRIVER |
| **Audit** | `GET /admin/audit-logs` | ADMIN |
| **Admin Users** | `GET /admin/users`, `PATCH /admin/users/:id/role`, `DELETE /admin/users/:id` | ADMIN |

**Total:** 23 new APIs (easily exceeds the 20+ requirement) ✅

---

## 🔴 Step 1 — Install Day 3 Dependencies (5 min)

```bash
npm install multer cloudinary
npm install -D @types/multer
```

> We install these now so the file upload infra is ready even if Cloudinary upload only gets wired in Day 4/5.

**📝 Commit #15:**
```
chore: install multer and cloudinary for file upload infrastructure
```

---

## 🔴 Step 2 — Shared Utilities: Pagination & Audit Logger

### `src/utils/pagination.ts`

```ts
import type { Request } from "express";

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const getPagination = (req: Request) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const buildMeta = (
  page: number,
  limit: number,
  total: number,
): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});
```

### `src/utils/auditLogger.ts`

```ts
import { prisma } from "../config/db";

export const logAudit = async (
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>,
) => {
  await prisma.auditLog.create({
    data: { actorId, action, entityType, entityId, metadata },
  });
};
```

**📝 Commit #16:**
```
feat(utils): add pagination helpers and audit logger utility
```

---

## 🔴 Step 3 — Ambulance Module

### `src/modules/ambulance/ambulance.validator.ts`

```ts
import { z } from "zod";

export const createAmbulanceSchema = z.object({
  body: z.object({
    vehicleNumber: z.string().min(1, "Vehicle number is required"),
    type: z.enum(["BASIC", "ADVANCED_LIFE_SUPPORT", "INTENSIVE_CARE"]),
    make: z.string().optional(),
    year: z.number().int().optional(),
  }),
});

export const updateAmbulanceSchema = z.object({
  body: z.object({
    vehicleNumber: z.string().optional(),
    type: z.enum(["BASIC", "ADVANCED_LIFE_SUPPORT", "INTENSIVE_CARE"]).optional(),
    status: z.enum(["AVAILABLE", "DISPATCHED", "MAINTENANCE", "RETIRED"]).optional(),
    make: z.string().optional(),
    year: z.number().int().optional(),
  }),
});

export const listAmbulanceSchema = z.object({
  query: z.object({
    status: z.enum(["AVAILABLE", "DISPATCHED", "MAINTENANCE", "RETIRED"]).optional(),
    type: z.enum(["BASIC", "ADVANCED_LIFE_SUPPORT", "INTENSIVE_CARE"]).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export type CreateAmbulanceInput = z.infer<typeof createAmbulanceSchema>["body"];
export type UpdateAmbulanceInput = z.infer<typeof updateAmbulanceSchema>["body"];
```

### `src/modules/ambulance/ambulance.service.ts`

```ts
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import { buildMeta, getPagination } from "../../utils/pagination";
import type { Request } from "express";
import type { CreateAmbulanceInput, UpdateAmbulanceInput } from "./ambulance.validator";

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
      include: { driver: { include: { user: { select: { name: true, phone: true } } } } },
    }),
    prisma.ambulance.count({ where }),
  ]);

  return { ambulances, meta: buildMeta(page, limit, total) };
};

export const getAmbulanceById = async (id: string) => {
  const ambulance = await prisma.ambulance.findFirst({
    where: { id, deletedAt: null },
    include: { driver: { include: { user: { select: { name: true, email: true, phone: true } } } } },
  });
  if (!ambulance) throw new AppError("Ambulance not found", 404);
  return ambulance;
};

export const updateAmbulance = async (id: string, data: UpdateAmbulanceInput) => {
  await getAmbulanceById(id); // Validate existence
  return prisma.ambulance.update({ where: { id }, data });
};

export const softDeleteAmbulance = async (id: string) => {
  await getAmbulanceById(id); // Validate existence
  return prisma.ambulance.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
};
```

### `src/modules/ambulance/ambulance.controller.ts`

```ts
import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { logAudit } from "../../utils/auditLogger";
import * as ambulanceService from "./ambulance.service";

export const create = asyncHandler(async (req: Request, res: Response) => {
  const ambulance = await ambulanceService.createAmbulance(req.body);
  await logAudit(req.user!.userId, "CREATE", "Ambulance", ambulance.id);
  sendSuccess(res, "Ambulance created successfully", ambulance, 201);
});

export const list = asyncHandler(async (req: Request, res: Response) => {
  const result = await ambulanceService.listAmbulances(req);
  sendSuccess(res, "Ambulances fetched successfully", result);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const ambulance = await ambulanceService.getAmbulanceById(req.params.id);
  sendSuccess(res, "Ambulance fetched successfully", ambulance);
});

export const update = asyncHandler(async (req: Request, res: Response) => {
  const ambulance = await ambulanceService.updateAmbulance(req.params.id, req.body);
  await logAudit(req.user!.userId, "UPDATE", "Ambulance", ambulance.id, req.body);
  sendSuccess(res, "Ambulance updated successfully", ambulance);
});

export const remove = asyncHandler(async (req: Request, res: Response) => {
  await ambulanceService.softDeleteAmbulance(req.params.id);
  await logAudit(req.user!.userId, "DELETE", "Ambulance", req.params.id);
  sendSuccess(res, "Ambulance deleted successfully", null);
});
```

### `src/modules/ambulance/ambulance.routes.ts`

```ts
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import * as ctrl from "./ambulance.controller";
import {
  createAmbulanceSchema,
  listAmbulanceSchema,
  updateAmbulanceSchema,
} from "./ambulance.validator";

const router = Router();

// GET /api/v1/ambulances — Public (no auth required for listing)
router.get("/", validate(listAmbulanceSchema), ctrl.list);

// GET /api/v1/ambulances/:id — Public
router.get("/:id", ctrl.getById);

// POST /api/v1/ambulances — ADMIN only
router.post("/", authenticate, authorize("ADMIN"), validate(createAmbulanceSchema), ctrl.create);

// PATCH /api/v1/ambulances/:id — ADMIN only
router.patch("/:id", authenticate, authorize("ADMIN"), validate(updateAmbulanceSchema), ctrl.update);

// DELETE /api/v1/ambulances/:id — ADMIN only
router.delete("/:id", authenticate, authorize("ADMIN"), ctrl.remove);

export default router;
```

**📝 Commit #17:**
```
feat(ambulance): add full CRUD module with pagination, filtering, and soft delete
```

---

## 🔴 Step 4 — Driver Module

### `src/modules/driver/driver.validator.ts`

```ts
import { z } from "zod";

export const createDriverSchema = z.object({
  body: z.object({
    userId: z.string().uuid("Must be a valid user ID"),
    licenseNumber: z.string().min(1, "License number is required"),
    ambulanceId: z.string().uuid().optional(),
  }),
});

export const updateDriverSchema = z.object({
  body: z.object({
    licenseNumber: z.string().optional(),
    ambulanceId: z.string().uuid().nullable().optional(),
    isAvailable: z.boolean().optional(),
  }),
});

export type CreateDriverInput = z.infer<typeof createDriverSchema>["body"];
export type UpdateDriverInput = z.infer<typeof updateDriverSchema>["body"];
```

### `src/modules/driver/driver.service.ts`

```ts
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import { buildMeta, getPagination } from "../../utils/pagination";
import type { Request } from "express";
import type { CreateDriverInput, UpdateDriverInput } from "./driver.validator";

export const createDriver = async (data: CreateDriverInput) => {
  const user = await prisma.user.findUnique({ where: { id: data.userId } });
  if (!user) throw new AppError("User not found", 404);

  const existing = await prisma.driver.findUnique({ where: { userId: data.userId } });
  if (existing) throw new AppError("This user is already a registered driver", 409);

  // Update user role to DRIVER
  await prisma.user.update({
    where: { id: data.userId },
    data: { role: "DRIVER" },
  });

  return prisma.driver.create({ data });
};

export const listDrivers = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const isAvailable = req.query.isAvailable === "true"
    ? true
    : req.query.isAvailable === "false"
    ? false
    : undefined;

  const where = { deletedAt: null, ...(isAvailable !== undefined && { isAvailable }) };

  const [drivers, total] = await Promise.all([
    prisma.driver.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        ambulance: { select: { vehicleNumber: true, type: true, status: true } },
      },
    }),
    prisma.driver.count({ where }),
  ]);

  return { drivers, meta: buildMeta(page, limit, total) };
};

export const getDriverById = async (id: string) => {
  const driver = await prisma.driver.findFirst({
    where: { id, deletedAt: null },
    include: {
      user: { select: { name: true, email: true, phone: true, role: true } },
      ambulance: true,
    },
  });
  if (!driver) throw new AppError("Driver not found", 404);
  return driver;
};

export const getMyDriverProfile = async (userId: string) => {
  const driver = await prisma.driver.findFirst({
    where: { userId, deletedAt: null },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      ambulance: true,
    },
  });
  if (!driver) throw new AppError("Driver profile not found", 404);
  return driver;
};

export const updateDriver = async (id: string, data: UpdateDriverInput) => {
  await getDriverById(id);
  return prisma.driver.update({ where: { id }, data });
};

export const softDeleteDriver = async (id: string) => {
  await getDriverById(id);
  return prisma.driver.update({ where: { id }, data: { deletedAt: new Date() } });
};
```

### `src/modules/driver/driver.routes.ts`

```ts
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import * as driverService from "./driver.service";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { logAudit } from "../../utils/auditLogger";
import {
  createDriverSchema,
  updateDriverSchema,
} from "./driver.validator";

const router = Router();

// GET /api/v1/drivers/me — Authenticated Driver only
router.get(
  "/me",
  authenticate,
  authorize("DRIVER"),
  asyncHandler(async (req, res) => {
    const driver = await driverService.getMyDriverProfile(req.user!.userId);
    sendSuccess(res, "Driver profile fetched", driver);
  }),
);

// GET /api/v1/drivers — ADMIN only
router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  asyncHandler(async (req, res) => {
    const result = await driverService.listDrivers(req);
    sendSuccess(res, "Drivers fetched successfully", result);
  }),
);

// GET /api/v1/drivers/:id — ADMIN only
router.get(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  asyncHandler(async (req, res) => {
    const driver = await driverService.getDriverById(req.params.id);
    sendSuccess(res, "Driver fetched successfully", driver);
  }),
);

// POST /api/v1/drivers — ADMIN only
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createDriverSchema),
  asyncHandler(async (req, res) => {
    const driver = await driverService.createDriver(req.body);
    await logAudit(req.user!.userId, "CREATE", "Driver", driver.id);
    sendSuccess(res, "Driver registered successfully", driver, 201);
  }),
);

// PATCH /api/v1/drivers/:id — ADMIN only
router.patch(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  validate(updateDriverSchema),
  asyncHandler(async (req, res) => {
    const driver = await driverService.updateDriver(req.params.id, req.body);
    await logAudit(req.user!.userId, "UPDATE", "Driver", driver.id, req.body);
    sendSuccess(res, "Driver updated successfully", driver);
  }),
);

// DELETE /api/v1/drivers/:id — ADMIN only
router.delete(
  "/:id",
  authenticate,
  authorize("ADMIN"),
  asyncHandler(async (req, res) => {
    await driverService.softDeleteDriver(req.params.id);
    await logAudit(req.user!.userId, "DELETE", "Driver", req.params.id);
    sendSuccess(res, "Driver deleted successfully", null);
  }),
);

export default router;
```

**📝 Commit #18:**
```
feat(driver): add driver module with role promotion, availability filter, and driver profile
```

---

## 🔴 Step 5 — Hospital Module

Same CRUD pattern as Ambulance. Key differences:
- `GET /hospitals` and `GET /hospitals/:id` are **public** (no auth needed).
- `POST`, `PATCH`, `DELETE` are **ADMIN** only.
- Support filtering by `?name=dhaka` (search) and pagination.

### `src/modules/hospital/hospital.validator.ts`

```ts
import { z } from "zod";

export const createHospitalSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name is required"),
    address: z.string().min(5, "Address is required"),
    phone: z.string().min(6, "Phone is required"),
    lat: z.number().optional(),
    lng: z.number().optional(),
    capacity: z.number().int().positive().optional(),
  }),
});

export const updateHospitalSchema = z.object({
  body: z.object({
    name: z.string().optional(),
    address: z.string().optional(),
    phone: z.string().optional(),
    lat: z.number().optional(),
    lng: z.number().optional(),
    capacity: z.number().int().positive().optional(),
  }),
});

export type CreateHospitalInput = z.infer<typeof createHospitalSchema>["body"];
export type UpdateHospitalInput = z.infer<typeof updateHospitalSchema>["body"];
```

### Key service logic for Hospital search

```ts
// Search by name — use this in listHospitals service
const where = {
  deletedAt: null,
  ...(name && { name: { contains: name as string, mode: "insensitive" as const } }),
};
```

**📝 Commit #19:**
```
feat(hospital): add hospital module with public listing and name search
```

---

## 🔴 Step 6 — Emergency Request Module (Core Business Logic)

This is the most important module — it is the heart of the dispatch system.

### `src/modules/request/request.validator.ts`

```ts
import { z } from "zod";

export const createRequestSchema = z.object({
  body: z.object({
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).default("HIGH"),
    pickupAddress: z.string().min(5, "Pickup address is required"),
    pickupLat: z.number().optional(),
    pickupLng: z.number().optional(),
    description: z.string().optional(),
  }),
});

export const listRequestSchema = z.object({
  query: z.object({
    status: z.enum(["PENDING", "DISPATCHED", "CANCELLED", "COMPLETED"]).optional(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
    page: z.string().optional(),
    limit: z.string().optional(),
  }),
});

export type CreateRequestInput = z.infer<typeof createRequestSchema>["body"];
```

### `src/modules/request/request.service.ts`

```ts
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import { buildMeta, getPagination } from "../../utils/pagination";
import type { Request } from "express";
import type { CreateRequestInput } from "./request.validator";

export const createRequest = async (callerId: string, data: CreateRequestInput) => {
  // Business rule: Patient cannot have 2 PENDING requests at the same time
  const activePending = await prisma.emergencyRequest.findFirst({
    where: { callerId, status: "PENDING", deletedAt: null },
  });
  if (activePending) {
    throw new AppError("You already have an active pending request", 409);
  }

  return prisma.emergencyRequest.create({
    data: { callerId, ...data },
  });
};

export const listRequests = async (req: Request) => {
  const { page, limit, skip } = getPagination(req);
  const { status, priority } = req.query as { status?: string; priority?: string };

  const where = {
    deletedAt: null,
    ...(status && { status: status as never }),
    ...(priority && { priority: priority as never }),
  };

  const [requests, total] = await Promise.all([
    prisma.emergencyRequest.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
      include: {
        caller: { select: { name: true, phone: true } },
        dispatch: { select: { status: true, ambulance: { select: { vehicleNumber: true } } } },
      },
    }),
    prisma.emergencyRequest.count({ where }),
  ]);

  return { requests, meta: buildMeta(page, limit, total) };
};

export const getRequestById = async (id: string) => {
  const request = await prisma.emergencyRequest.findFirst({
    where: { id, deletedAt: null },
    include: {
      caller: { select: { name: true, email: true, phone: true } },
      dispatch: {
        include: {
          ambulance: true,
          driver: { include: { user: { select: { name: true, phone: true } } } },
          hospital: true,
        },
      },
      payment: true,
    },
  });
  if (!request) throw new AppError("Emergency request not found", 404);
  return request;
};

export const getMyRequests = async (callerId: string, req: Request) => {
  const { page, limit, skip } = getPagination(req);

  const [requests, total] = await Promise.all([
    prisma.emergencyRequest.findMany({
      where: { callerId, deletedAt: null },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { dispatch: { select: { status: true } }, payment: { select: { status: true, amount: true } } },
    }),
    prisma.emergencyRequest.count({ where: { callerId, deletedAt: null } }),
  ]);

  return { requests, meta: buildMeta(page, limit, total) };
};

export const cancelRequest = async (id: string, callerId: string, role: string) => {
  const request = await getRequestById(id);

  // Only the caller or ADMIN can cancel
  if (role !== "ADMIN" && request.callerId !== callerId) {
    throw new AppError("You do not have permission to cancel this request", 403);
  }

  if (!["PENDING"].includes(request.status)) {
    throw new AppError("Only PENDING requests can be cancelled", 400);
  }

  return prisma.emergencyRequest.update({
    where: { id },
    data: { status: "CANCELLED" },
  });
};
```

### `src/modules/request/request.routes.ts`

```ts
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { logAudit } from "../../utils/auditLogger";
import * as requestService from "./request.service";
import { createRequestSchema, listRequestSchema } from "./request.validator";

const router = Router();

// GET /api/v1/requests/my — Patient's own requests
router.get(
  "/my",
  authenticate,
  authorize("PATIENT"),
  asyncHandler(async (req, res) => {
    const result = await requestService.getMyRequests(req.user!.userId, req);
    sendSuccess(res, "Your requests fetched successfully", result);
  }),
);

// GET /api/v1/requests — ADMIN can see all
router.get(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(listRequestSchema),
  asyncHandler(async (req, res) => {
    const result = await requestService.listRequests(req);
    sendSuccess(res, "Requests fetched successfully", result);
  }),
);

// GET /api/v1/requests/:id — ALL authenticated users
router.get(
  "/:id",
  authenticate,
  asyncHandler(async (req, res) => {
    const request = await requestService.getRequestById(req.params.id);
    sendSuccess(res, "Request fetched successfully", request);
  }),
);

// POST /api/v1/requests — Patient creates request
router.post(
  "/",
  authenticate,
  authorize("PATIENT"),
  validate(createRequestSchema),
  asyncHandler(async (req, res) => {
    const request = await requestService.createRequest(req.user!.userId, req.body);
    await logAudit(req.user!.userId, "CREATE", "EmergencyRequest", request.id);
    sendSuccess(res, "Emergency request created successfully", request, 201);
  }),
);

// PATCH /api/v1/requests/:id/cancel — Patient or ADMIN
router.patch(
  "/:id/cancel",
  authenticate,
  authorize("PATIENT", "ADMIN"),
  asyncHandler(async (req, res) => {
    const request = await requestService.cancelRequest(
      req.params.id,
      req.user!.userId,
      req.user!.role,
    );
    await logAudit(req.user!.userId, "CANCEL", "EmergencyRequest", req.params.id);
    sendSuccess(res, "Request cancelled successfully", request);
  }),
);

export default router;
```

**📝 Commit #20:**
```
feat(request): add emergency request module with business rules and patient request tracking
```

---

## 🔴 Step 7 — Dispatch Module (Status Machine)

This module implements the core workflow: **ADMIN dispatches → DRIVER updates status progressively**.

### `src/modules/dispatch/dispatch.validator.ts`

```ts
import { z } from "zod";

export const createDispatchSchema = z.object({
  body: z.object({
    requestId: z.string().uuid("Invalid request ID"),
    ambulanceId: z.string().uuid("Invalid ambulance ID"),
    driverId: z.string().uuid("Invalid driver ID"),
    hospitalId: z.string().uuid().optional(),
  }),
});

export const updateDispatchStatusSchema = z.object({
  body: z.object({
    status: z.enum([
      "DISPATCHED",
      "EN_ROUTE",
      "PATIENT_PICKUP",
      "HOSPITAL_SELECTED",
      "HOSPITAL_ARRIVAL",
      "COMPLETED",
    ]),
    note: z.string().optional(),
    hospitalId: z.string().uuid().optional(),
  }),
});

export type CreateDispatchInput = z.infer<typeof createDispatchSchema>["body"];
export type UpdateDispatchStatusInput = z.infer<typeof updateDispatchStatusSchema>["body"];
```

### `src/modules/dispatch/dispatch.service.ts`

```ts
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";
import type { CreateDispatchInput, UpdateDispatchStatusInput } from "./dispatch.validator";

export const createDispatch = async (data: CreateDispatchInput) => {
  // Run all validations inside a transaction to prevent race conditions
  return prisma.$transaction(async (tx) => {
    const request = await tx.emergencyRequest.findFirst({
      where: { id: data.requestId, status: "PENDING" },
    });
    if (!request) throw new AppError("Request not found or not in PENDING status", 400);

    const ambulance = await tx.ambulance.findFirst({
      where: { id: data.ambulanceId, status: "AVAILABLE" },
    });
    if (!ambulance) throw new AppError("Ambulance is not available", 400);

    const driver = await tx.driver.findFirst({
      where: { id: data.driverId, isAvailable: true },
    });
    if (!driver) throw new AppError("Driver is not available", 400);

    // Check no existing dispatch for this request
    const existing = await tx.dispatch.findUnique({ where: { requestId: data.requestId } });
    if (existing) throw new AppError("This request is already dispatched", 409);

    // Update request status
    await tx.emergencyRequest.update({
      where: { id: data.requestId },
      data: { status: "DISPATCHED" },
    });

    // Mark ambulance & driver as unavailable
    await tx.ambulance.update({
      where: { id: data.ambulanceId },
      data: { status: "DISPATCHED" },
    });
    await tx.driver.update({
      where: { id: data.driverId },
      data: { isAvailable: false },
    });

    // Create dispatch record
    const dispatch = await tx.dispatch.create({
      data: { ...data },
    });

    // Create first status log
    await tx.tripStatusLog.create({
      data: {
        dispatchId: dispatch.id,
        status: "DISPATCHED",
        note: "Dispatch initiated by admin",
        updatedByUserId: driver.userId,
      },
    });

    return dispatch;
  });
};

export const getDispatchById = async (id: string) => {
  const dispatch = await prisma.dispatch.findUnique({
    where: { id },
    include: {
      request: { select: { pickupAddress: true, priority: true, status: true } },
      ambulance: { select: { vehicleNumber: true, type: true } },
      driver: { include: { user: { select: { name: true, phone: true } } } },
      hospital: true,
      tripStatusLogs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!dispatch) throw new AppError("Dispatch not found", 404);
  return dispatch;
};

export const updateDispatchStatus = async (
  id: string,
  data: UpdateDispatchStatusInput,
  actorId: string,
) => {
  const dispatch = await prisma.dispatch.findUnique({
    where: { id },
    include: { driver: true },
  });
  if (!dispatch) throw new AppError("Dispatch not found", 404);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.dispatch.update({
      where: { id },
      data: {
        status: data.status,
        ...(data.hospitalId && { hospitalId: data.hospitalId }),
        ...(data.status === "COMPLETED" && { completedAt: new Date() }),
      },
    });

    // Add status log
    await tx.tripStatusLog.create({
      data: {
        dispatchId: id,
        status: data.status,
        note: data.note,
        updatedByUserId: actorId,
      },
    });

    // If COMPLETED, free up ambulance & driver and mark request as completed
    if (data.status === "COMPLETED") {
      await tx.ambulance.update({
        where: { id: dispatch.ambulanceId },
        data: { status: "AVAILABLE" },
      });
      await tx.driver.update({
        where: { id: dispatch.driverId },
        data: { isAvailable: true },
      });
      await tx.emergencyRequest.update({
        where: { id: dispatch.requestId },
        data: { status: "COMPLETED" },
      });
    }

    return updated;
  });
};
```

### `src/modules/dispatch/dispatch.routes.ts`

```ts
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import { validate } from "../../middlewares/validate.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { logAudit } from "../../utils/auditLogger";
import * as dispatchService from "./dispatch.service";
import { createDispatchSchema, updateDispatchStatusSchema } from "./dispatch.validator";

const router = Router();

// POST /api/v1/dispatches — ADMIN dispatches an ambulance
router.post(
  "/",
  authenticate,
  authorize("ADMIN"),
  validate(createDispatchSchema),
  asyncHandler(async (req, res) => {
    const dispatch = await dispatchService.createDispatch(req.body);
    await logAudit(req.user!.userId, "DISPATCH", "Dispatch", dispatch.id, req.body);
    sendSuccess(res, "Ambulance dispatched successfully", dispatch, 201);
  }),
);

// GET /api/v1/dispatches/:id — ADMIN or DRIVER
router.get(
  "/:id",
  authenticate,
  authorize("ADMIN", "DRIVER"),
  asyncHandler(async (req, res) => {
    const dispatch = await dispatchService.getDispatchById(req.params.id);
    sendSuccess(res, "Dispatch details fetched successfully", dispatch);
  }),
);

// PATCH /api/v1/dispatches/:id/status — DRIVER or ADMIN updates status
router.patch(
  "/:id/status",
  authenticate,
  authorize("DRIVER", "ADMIN"),
  validate(updateDispatchStatusSchema),
  asyncHandler(async (req, res) => {
    const dispatch = await dispatchService.updateDispatchStatus(
      req.params.id,
      req.body,
      req.user!.userId,
    );
    await logAudit(req.user!.userId, "STATUS_UPDATE", "Dispatch", dispatch.id, req.body);
    sendSuccess(res, "Dispatch status updated successfully", dispatch);
  }),
);

export default router;
```

**📝 Commit #21:**
```
feat(dispatch): add dispatch module with transaction-safe ambulance assignment and status state machine
```

---

## 🔴 Step 8 — Admin Routes (Users + Audit Logs)

### `src/modules/admin/admin.routes.ts`

```ts
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import { authorize } from "../../middlewares/rbac.middleware";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import { getPagination, buildMeta } from "../../utils/pagination";
import { logAudit } from "../../utils/auditLogger";
import { prisma } from "../../config/db";
import { AppError } from "../../utils/AppError";

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, authorize("ADMIN"));

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
          id: true, name: true, email: true, role: true,
          phone: true, isActive: true, createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(res, "Users fetched successfully", { users, meta: buildMeta(page, limit, total) });
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
    await logAudit(req.user!.userId, "UPDATE_ROLE", "User", user.id, { newRole: role });
    sendSuccess(res, "User role updated successfully", user);
  }),
);

// DELETE /api/v1/admin/users/:id — Soft delete user
router.delete(
  "/users/:id",
  asyncHandler(async (req, res) => {
    // Prevent self-deletion
    if (req.params.id === req.user!.userId) {
      throw new AppError("You cannot delete your own account", 400);
    }
    await prisma.user.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await logAudit(req.user!.userId, "DELETE", "User", req.params.id);
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
        include: { actor: { select: { name: true, email: true, role: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    sendSuccess(res, "Audit logs fetched successfully", { logs, meta: buildMeta(page, limit, total) });
  }),
);

export default router;
```

**📝 Commit #22:**
```
feat(admin): add admin user management and audit log endpoints
```

---

## 🔴 Step 9 — Mount All Routes in `src/app.ts`

Add these imports and route mounts before the 404 handler:

```ts
import ambulanceRoutes from "./modules/ambulance/ambulance.routes";
import driverRoutes from "./modules/driver/driver.routes";
import hospitalRoutes from "./modules/hospital/hospital.routes";
import requestRoutes from "./modules/request/request.routes";
import dispatchRoutes from "./modules/dispatch/dispatch.routes";
import adminRoutes from "./modules/admin/admin.routes";

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/ambulances", ambulanceRoutes);
app.use("/api/v1/drivers", driverRoutes);
app.use("/api/v1/hospitals", hospitalRoutes);
app.use("/api/v1/requests", requestRoutes);
app.use("/api/v1/dispatches", dispatchRoutes);
app.use("/api/v1/admin", adminRoutes);
```

**📝 Commit #23:**
```
feat(app): mount all Day 3 business modules in Express app
```

---

## 🔴 Step 10 — Build, Lint & End-to-End Test

### Commands:
```bash
npm run lint:fix
npm run build
npm run dev
```

### Full API Test Checklist in Postman:

| # | Method | URL | Role | Action |
| --- | ------- | --- | ---- | ------ |
| 1 | `POST` | `/api/v1/ambulances` | ADMIN | Create ambulance |
| 2 | `GET` | `/api/v1/ambulances` | Public | List with `?status=AVAILABLE` |
| 3 | `GET` | `/api/v1/ambulances/:id` | Public | Get single |
| 4 | `PATCH` | `/api/v1/ambulances/:id` | ADMIN | Update status to MAINTENANCE |
| 5 | `DELETE` | `/api/v1/ambulances/:id` | ADMIN | Soft delete |
| 6 | `POST` | `/api/v1/drivers` | ADMIN | Register driver (links a User) |
| 7 | `GET` | `/api/v1/drivers` | ADMIN | List drivers with `?isAvailable=true` |
| 8 | `GET` | `/api/v1/drivers/me` | DRIVER | My driver profile |
| 9 | `POST` | `/api/v1/hospitals` | ADMIN | Create hospital |
| 10 | `GET` | `/api/v1/hospitals` | Public | List with `?name=dhaka` |
| 11 | `POST` | `/api/v1/requests` | PATIENT | Create emergency request |
| 12 | `GET` | `/api/v1/requests/my` | PATIENT | My requests list |
| 13 | `GET` | `/api/v1/requests` | ADMIN | All requests with filters |
| 14 | `PATCH` | `/api/v1/requests/:id/cancel` | PATIENT | Cancel pending request |
| 15 | `POST` | `/api/v1/dispatches` | ADMIN | Dispatch ambulance (transaction) |
| 16 | `GET` | `/api/v1/dispatches/:id` | ADMIN/DRIVER | Get dispatch details |
| 17 | `PATCH` | `/api/v1/dispatches/:id/status` | DRIVER | Update status to `EN_ROUTE` |
| 18 | `PATCH` | `/api/v1/dispatches/:id/status` | DRIVER | Update status to `COMPLETED` |
| 19 | `GET` | `/api/v1/admin/users` | ADMIN | List users with search/filter |
| 20 | `PATCH` | `/api/v1/admin/users/:id/role` | ADMIN | Change user role |
| 21 | `DELETE` | `/api/v1/admin/users/:id` | ADMIN | Soft delete user |
| 22 | `GET` | `/api/v1/admin/audit-logs` | ADMIN | View all audit logs |

---

## 🔴 Step 11 — Push to GitHub & Verify Render Deployment

```bash
git push origin main
```

Check Render logs to confirm:
- Build succeeds with `✔ Generated Prisma Client` + `0 TypeScript errors`
- Service stays `Live`

**📝 Final Day 3 Commit (if any cleanup needed):**
```
fix(day3): lint fixes and cleanup for production build
```

---

## 📊 Day 3 Git Commit Summary

| # | Commit Message | After Step |
| --- | -------------- | ---------- |
| 15 | `chore: install multer and cloudinary for file upload infrastructure` | Step 1 |
| 16 | `feat(utils): add pagination helpers and audit logger utility` | Step 2 |
| 17 | `feat(ambulance): add full CRUD module with pagination, filtering, and soft delete` | Step 3 |
| 18 | `feat(driver): add driver module with role promotion, availability filter, and driver profile` | Step 4 |
| 19 | `feat(hospital): add hospital module with public listing and name search` | Step 5 |
| 20 | `feat(request): add emergency request module with business rules and patient request tracking` | Step 6 |
| 21 | `feat(dispatch): add dispatch module with transaction-safe ambulance assignment and status state machine` | Step 7 |
| 22 | `feat(admin): add admin user management and audit log endpoints` | Step 8 |
| 23 | `feat(app): mount all Day 3 business modules in Express app` | Step 9 |

---

## ✅ Day 3 Done Checklist

- [ ] `multer` and `cloudinary` installed
- [ ] `pagination.ts` + `auditLogger.ts` utilities added
- [ ] **Ambulance Module**: 5 routes (list, get, create, update, soft delete)
- [ ] **Driver Module**: 6 routes (list, get, me, create, update, soft delete)
- [ ] **Hospital Module**: 5 routes (list, get, create, update, soft delete)
- [ ] **Emergency Request Module**: 5 routes (list, my, get, create, cancel)
- [ ] **Dispatch Module**: 3 routes (create, get, status update with state machine)
- [ ] **Admin Module**: 4 routes (list users, update role, delete user, audit logs)
- [ ] All routes mounted in `src/app.ts`
- [ ] All 22 Postman tests passing
- [ ] `npm run build` passing with 0 TypeScript errors
- [ ] Biome lint clean
- [ ] 9 clean semantic Git commits pushed to GitHub
- [ ] Render deployment live and healthy
