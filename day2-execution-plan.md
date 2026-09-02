# 🗓️ Day 2 Execution Plan — Authentication & User Module

**Date:** September 03, 2026 | **Target Duration:** ~5-6 hours

---

## ✅ Day 1 Completed (Foundation)

- [x] Project initialized, TypeScript + Express + Biome configured
- [x] Prisma 7.10 schema migrated, seeded, running on Neon PostgreSQL
- [x] Deployed live on Render: https://ambulance-dispatch-backend-66f2.onrender.com
- [x] Git + GitHub fully set up with auto-deploy on push

---

## 📋 Day 2 Deliverables

| Module       | Endpoints                                                              | Auth Required |
| ------------ | ---------------------------------------------------------------------- | ------------- |
| Auth         | `POST /register`, `POST /login`, `POST /logout`, `POST /refresh-token` | ❌ Public     |
| Auth (OAuth) | `GET /auth/google`, `GET /auth/google/callback`                        | ❌ Public     |
| Middlewares  | JWT verify + RBAC role guard                                           | —             |
| User         | `GET /users/me`, `PATCH /users/me`                                     | ✅ All roles  |

---

## 🔴 Step 1 — Install New Dependencies (5 min)

```bash
npm install passport passport-google-oauth20 express-async-errors
npm install @types/passport @types/passport-google-oauth20
```

> **Note:** `express-async-errors` patches Express to catch async errors automatically — a common senior-dev pattern.

**📝 Commit #7:**

```
chore: install passport, google oauth, and async error handling packages
```

---

## 🔴 Step 2 — Auth Validator (`src/modules/auth/auth.validator.ts`)

Define all input schemas with Zod for strict runtime validation:

```ts
import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and a number",
      ),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
  }),
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];
```

---

## 🔴 Step 3 — Zod Validation Middleware (`src/middlewares/validate.middleware.ts`)

A reusable validation middleware accepting any Zod schema:

```ts
import type { NextFunction, Request, Response } from "express";
import { type ZodSchema, ZodError } from "zod";
import { AppError } from "../utils/AppError";

export const validate =
  (schema: ZodSchema) => (req: Request, _res: Response, next: NextFunction) => {
    try {
      schema.parse({ body: req.body, params: req.params, query: req.query });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        return next(new AppError("Validation failed", 422, errors));
      }
      next(error);
    }
  };
```

---

## 🔴 Step 4 — JWT Token Utilities (`src/utils/jwt.ts`)

```ts
import jwt from "jsonwebtoken";
import { AppError } from "./AppError";

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? "30d";

export interface JwtPayload {
  userId: string;
  role: string;
}

export const generateAccessToken = (payload: JwtPayload): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

export const generateRefreshToken = (payload: JwtPayload): string =>
  jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });

export const verifyAccessToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    throw new AppError("Invalid or expired access token", 401);
  }
};

export const verifyRefreshToken = (token: string): JwtPayload => {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }
};
```

---

## 🔴 Step 5 — Auth Middleware (`src/middlewares/auth.middleware.ts`)

JWT verification middleware — extracts user from token and attaches to `req.user`:

```ts
import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/jwt";
import { AppError } from "../utils/AppError";

declare global {
  namespace Express {
    interface Request {
      user?: { userId: string; role: string };
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
```

---

## 🔴 Step 6 — RBAC Middleware (`src/middlewares/rbac.middleware.ts`)

Role guard — restricts access based on user role:

```ts
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

type Role = "PATIENT" | "DRIVER" | "ADMIN";

export const authorize =
  (...allowedRoles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError("Unauthorized — please log in", 401));
    }
    if (!allowedRoles.includes(req.user.role as Role)) {
      return next(
        new AppError(
          `Access denied — requires one of: ${allowedRoles.join(", ")}`,
          403,
        ),
      );
    }
    next();
  };
```

---

## 🔴 Step 7 — Auth Service (`src/modules/auth/auth.service.ts`)

Business logic layer — all DB operations happen here:

```ts
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
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) throw new AppError("Email already in use", 409);

  const passwordHash = await bcrypt.hash(data.password, 12);

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

  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  const refreshToken = generateRefreshToken({
    userId: user.id,
    role: user.role,
  });

  return { user, accessToken, refreshToken };
};

export const login = async (data: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user || !user.passwordHash)
    throw new AppError("Invalid email or password", 401);
  if (!user.isActive)
    throw new AppError("Your account has been deactivated", 403);

  const isMatch = await bcrypt.compare(data.password, user.passwordHash);
  if (!isMatch) throw new AppError("Invalid email or password", 401);

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
  const payload = verifyRefreshToken(token);
  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user || !user.isActive)
    throw new AppError("User not found or deactivated", 401);

  const accessToken = generateAccessToken({ userId: user.id, role: user.role });
  return { accessToken };
};
```

---

## 🔴 Step 8 — Auth Controller (`src/modules/auth/auth.controller.ts`)

```ts
import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import * as authService from "./auth.service";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  sendSuccess(res, "Registration successful", result, 201);
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body);
  sendSuccess(res, "Login successful", result);
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, "Logged out successfully", null);
});

export const refreshToken = asyncHandler(
  async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    const result = await authService.refreshAccessToken(refreshToken);
    sendSuccess(res, "Access token refreshed", result);
  },
);
```

---

## 🔴 Step 9 — Auth Routes (`src/modules/auth/auth.routes.ts`)

```ts
import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import * as authController from "./auth.controller";
import {
  loginSchema,
  refreshTokenSchema,
  registerSchema,
} from "./auth.validator";

const router = Router();

// POST /api/v1/auth/register
router.post("/register", validate(registerSchema), authController.register);

// POST /api/v1/auth/login
router.post("/login", validate(loginSchema), authController.login);

// POST /api/v1/auth/logout
router.post("/logout", authenticate, authController.logout);

// POST /api/v1/auth/refresh-token
router.post(
  "/refresh-token",
  validate(refreshTokenSchema),
  authController.refreshToken,
);

export default router;
```

---

## 🔴 Step 10 — User Module

### `src/modules/user/user.service.ts`

```ts
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
  return prisma.user.update({
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
};
```

### `src/modules/user/user.validator.ts`

```ts
import { z } from "zod";

export const updateMeSchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  }),
});
```

### `src/modules/user/user.controller.ts`

```ts
import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { sendSuccess } from "../../utils/response";
import * as userService from "./user.service";

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getMe(req.user!.userId);
  sendSuccess(res, "Profile fetched successfully", user);
});

export const updateMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateMe(req.user!.userId, req.body);
  sendSuccess(res, "Profile updated successfully", user);
});
```

### `src/modules/user/user.routes.ts`

```ts
import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { authenticate } from "../../middlewares/auth.middleware";
import * as userController from "./user.controller";
import { updateMeSchema } from "./user.validator";

const router = Router();

router.use(authenticate);

// GET /api/v1/users/me
router.get("/me", userController.getMe);

// PATCH /api/v1/users/me
router.patch("/me", validate(updateMeSchema), userController.updateMe);

export default router;
```

---

## 🔴 Step 11 — Mount Routes in `src/app.ts`

Add these two lines before the 404 handler:

```ts
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
```

---

## 🔴 Step 12 — Google OAuth (Configure & Test)

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project → Enable **Google+ API / People API**
3. Create OAuth 2.0 credentials (Web Application)
4. Add authorized redirect URI: `http://localhost:5000/api/v1/auth/google/callback`
5. Copy Client ID and Secret into `.env`

---

## 🔴 Step 13 — Build, Lint, Test

```bash
npm run lint:fix
npm run build
npm run dev
```

### Postman Test Sequence

| #   | Method  | URL                          | Auth             | Expected        |
| --- | ------- | ---------------------------- | ---------------- | --------------- |
| 1   | `POST`  | `/api/v1/auth/register`      | None             | 201 + tokens    |
| 2   | `POST`  | `/api/v1/auth/login`         | None             | 200 + tokens    |
| 3   | `GET`   | `/api/v1/users/me`           | `Bearer <token>` | 200 + profile   |
| 4   | `PATCH` | `/api/v1/users/me`           | `Bearer <token>` | 200 + updated   |
| 5   | `POST`  | `/api/v1/auth/refresh-token` | None             | 200 + new token |
| 6   | `POST`  | `/api/v1/auth/logout`        | `Bearer <token>` | 200             |
| 7   | `POST`  | `/api/v1/auth/register`      | None             | 422 (bad email) |
| 8   | `GET`   | `/api/v1/users/me`           | None             | 401 (no token)  |

---

## 📊 Day 2 Git Commit Summary

| #   | Commit Message                                                               | After Step |
| --- | ---------------------------------------------------------------------------- | ---------- |
| 7   | `chore: install passport, google oauth, and async error handling packages`   | Step 1     |
| 8   | `feat(auth): add Zod validation schemas and reusable validate middleware`    | Steps 2-3  |
| 9   | `feat(auth): add JWT access and refresh token utilities`                     | Step 4     |
| 10  | `feat(middleware): add JWT authenticate and RBAC authorize middlewares`      | Steps 5-6  |
| 11  | `feat(auth): add auth service, controller, and routes`                       | Steps 7-9  |
| 12  | `feat(user): add user service, controller, and routes for GET and PATCH /me` | Step 10    |
| 13  | `feat(app): mount auth and user routes in Express app`                       | Step 11    |
| 14  | `feat(auth): add Google OAuth 2.0 passport strategy and routes`              | Step 12    |

---

## ✅ Day 2 Done Checklist

- [x] `passport` + `passport-google-oauth20` + `express-async-errors` installed
- [x] Zod validator schemas: `registerSchema`, `loginSchema`, `refreshTokenSchema`
- [x] Reusable `validate` middleware
- [x] JWT utilities: generate + verify access and refresh tokens
- [x] `authenticate` middleware attaching `req.user`
- [x] `authorize(...roles)` RBAC middleware
- [x] Auth service: `register`, `login`, `refreshAccessToken`
- [x] Auth controller + 4 routes
- [x] User service: `getMe`, `updateMe`
- [x] User controller + 2 routes
- [x] Routes mounted in `src/app.ts`
- [x] `npm run build` passing with 0 TypeScript errors
- [x] Biome formatting and linting clean
- [x] Google OAuth configured with passport strategy and routes
- [x] Clean, semantic Git commits pushed to GitHub
