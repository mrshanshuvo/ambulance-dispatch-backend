# 🗓️ Day 1 Completion Plan
**Date:** September 02, 2026 | **Target Duration:** ~3-4 hours

---

## ✅ Already Completed (Planning Phase)
- [x] Project selected & problem domain defined (`Emergency Ambulance Dispatch System`)
- [x] 3 roles + full RBAC permission matrix mapped out (`PATIENT`, `DRIVER`, `ADMIN`)
- [x] 30 API endpoints planned with auth requirements
- [x] ERD + 8 system diagrams created under `/diagrams`

---

## 🔴 Step 1 — Create GitHub Repo & Setup Git (5-10 min)

1. Go to [github.com/new](https://github.com/new)
2. Repo Name: `ambulance-dispatch-backend` (or your preferred repo name)
3. Visibility: **Public** (required for assignment evaluation)
4. Add: **README.md**, **.gitignore (Node)**, **License (MIT)**
5. Clone or link to local directory:
```bash
git init
git remote add origin https://github.com/YOUR_USERNAME/ambulance-dispatch-backend.git
```

---

## 🔴 Step 2 — Initialize Node.js + TypeScript Project (20 min)

### 1. Initialize npm package
```bash
npm init -y
```

### 2. Install all core & dev dependencies
```bash
# Core framework & security
npm install express dotenv cors helmet express-rate-limit

# Authentication & cryptography
npm install jsonwebtoken bcrypt
npm install -D @types/jsonwebtoken @types/bcrypt @types/cors @types/express @types/node

# Validation & ORM
npm install zod @prisma/client
npm install -D prisma

# TypeScript tooling & fast dev runner
npm install -D typescript tsx @types/helmet

# Linter & Formatter
npm install -D @biomejs/biome
```

### 3. Generate & configure `tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### 4. Configure `package.json` scripts
```json
"scripts": {
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "db:migrate": "prisma migrate dev",
  "db:generate": "prisma generate",
  "db:seed": "tsx src/prisma/seed.ts",
  "db:studio": "prisma studio",
  "lint": "biome check src/"
},
"prisma": {
  "seed": "tsx src/prisma/seed.ts"
}
```

### 5. Init Biome configuration
```bash
npx biome init
```

**📝 Commit #1:**
```
feat: initialize Node.js TypeScript Express project with dependencies
```

---

## 🔴 Step 3 — Build Clean Modular Folder Structure (10 min)

Create the directory layout inside `src/`:

```
src/
├── config/
│   ├── env.ts              # Env loading & validation
│   ├── cors.ts             # Allowed origins configuration
│   └── redis.ts            # Redis client (Upstash/ioredis placeholder)
├── modules/
│   ├── auth/
│   │   ├── auth.routes.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   └── auth.validator.ts
│   ├── user/
│   ├── emergency-request/
│   ├── dispatch/
│   ├── ambulance/
│   ├── driver/
│   ├── hospital/
│   ├── payment/
│   └── admin/
├── middlewares/
│   ├── auth.middleware.ts      # JWT verification & attach req.user
│   ├── rbac.middleware.ts      # Role-based guard (PATIENT / DRIVER / ADMIN)
│   ├── rateLimiter.middleware.ts
│   └── errorHandler.middleware.ts
├── utils/
│   ├── response.ts             # Standard { success, message, data/errors } helpers
│   ├── AppError.ts             # Custom HTTP error class
│   └── asyncHandler.ts        # Async wrapper for controllers
├── prisma/
│   └── seed.ts                 # Database seeding script
├── app.ts                      # Express app setup & middleware stack
└── server.ts                   # HTTP listener entrypoint
```

**📝 Commit #2:**
```
feat: add modular folder structure for all API modules
```

---

## 🔴 Step 4 — Express App Boilerplate (20 min)

### 1. `src/utils/AppError.ts`
```ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number,
    public errors?: unknown[]
  ) {
    super(message);
    this.name = 'AppError';
  }
}
```

### 2. `src/utils/response.ts`
```ts
import { Response } from 'express';

export const sendSuccess = (
  res: Response,
  message: string,
  data: unknown,
  statusCode = 200
) => res.status(statusCode).json({ success: true, message, data });

export const sendError = (
  res: Response,
  message: string,
  errors: unknown[] = [],
  statusCode = 400
) => res.status(statusCode).json({ success: false, message, errors });
```

### 3. `src/utils/asyncHandler.ts`
```ts
import { Request, Response, NextFunction } from 'express';

export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) =>
  (req: Request, res: Response, next: NextFunction) =>
    fn(req, res, next).catch(next);
```

### 4. `src/middlewares/errorHandler.middleware.ts`
```ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      errors: err.errors ?? [],
    });
  }
  console.error('[Unhandled Error]:', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
    errors: [],
  });
};
```

### 5. `src/app.ts`
```ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middlewares/errorHandler.middleware';

const app = express();

// Security & Headers
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL ?? '*', credentials: true }));

// Rate limiting (100 requests per 15 min window)
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Body parsing
app.use(express.json());

// Health Check Endpoint
app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Ambulance Dispatch API is healthy and running' });
});

// Centralized error handling
app.use(errorHandler);

export default app;
```

### 6. `src/server.ts`
```ts
import app from './app';

const PORT = process.env.PORT ?? 5000;

app.listen(PORT, () => {
  console.log(`🚑 Emergency Dispatch API running on port ${PORT}`);
});
```

### 7. `.env.example`
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# PostgreSQL connection string
DATABASE_URL=postgresql://user:password@host:5432/ambulance_db?sslmode=require

# JWT Secrets
JWT_SECRET=super_secret_jwt_access_token_key_here
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=super_secret_jwt_refresh_token_key_here
JWT_REFRESH_EXPIRES_IN=30d

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_CALLBACK_URL=http://localhost:5000/api/v1/auth/google/callback

# Stripe Payment
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Redis Cache (Upstash)
REDIS_URL=
REDIS_TOKEN=
```

**📝 Commit #3:**
```
feat: add Express app with helmet, cors, rate limiter, and error handler
```

---

## 🔴 Step 5 — Setup PostgreSQL Database (10 min)

1. Create a free PostgreSQL instance on **[Neon.tech](https://neon.tech)** (or Supabase).
2. Copy the Connection String into your `.env` file:
```env
DATABASE_URL="postgresql://user:password@ep-xyz.us-east-2.aws.neon.tech/ambulance_db?sslmode=require"
```

---

## 🔴 Step 6 — Write Prisma Schema (25 min)

Initialize Prisma:
```bash
npx prisma init
```

Populate `prisma/schema.prisma` with all 9 entities from our ERD:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── ENUMS ───────────────────────────────────────────────────────────────────

enum Role {
  PATIENT
  DRIVER
  ADMIN
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum RequestStatus {
  PENDING
  DISPATCHED
  CANCELLED
  COMPLETED
}

enum DispatchStatus {
  DISPATCHED
  EN_ROUTE
  PATIENT_PICKUP
  HOSPITAL_SELECTED
  HOSPITAL_ARRIVAL
  COMPLETED
}

enum AmbulanceStatus {
  AVAILABLE
  DISPATCHED
  MAINTENANCE
  RETIRED
}

enum AmbulanceType {
  BASIC
  ADVANCED_LIFE_SUPPORT
  INTENSIVE_CARE
}

enum PaymentStatus {
  PENDING
  SUCCESS
  FAILED
  REFUNDED
}

enum PaymentGateway {
  STRIPE
  BKASH
  SSLCOMMERZ
}

// ─── MODELS ──────────────────────────────────────────────────────────────────

model User {
  id           String    @id @default(uuid())
  name         String
  email        String    @unique
  passwordHash String?
  googleId     String?   @unique
  role         Role      @default(PATIENT)
  phone        String?
  address      String?
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  deletedAt    DateTime?

  emergencyRequests EmergencyRequest[]
  driver            Driver?
  tripStatusLogs    TripStatusLog[]
  auditLogs         AuditLog[]

  @@index([email])
  @@index([role])
  @@index([deletedAt])
}

model EmergencyRequest {
  id            String        @id @default(uuid())
  callerId      String
  priority      Priority      @default(HIGH)
  status        RequestStatus @default(PENDING)
  pickupAddress String
  pickupLat     Float?
  pickupLng     Float?
  description   String?
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt
  deletedAt     DateTime?

  caller   User      @relation(fields: [callerId], references: [id])
  dispatch Dispatch?
  payment  Payment?

  @@index([callerId])
  @@index([status])
  @@index([priority])
  @@index([createdAt])
  @@index([deletedAt])
}

model Ambulance {
  id            String          @id @default(uuid())
  vehicleNumber String          @unique
  type          AmbulanceType
  status        AmbulanceStatus @default(AVAILABLE)
  make          String?
  year          Int?
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  deletedAt     DateTime?

  driver     Driver?
  dispatches Dispatch[]

  @@index([status])
  @@index([deletedAt])
}

model Driver {
  id            String    @id @default(uuid())
  userId        String    @unique
  licenseNumber String    @unique
  ambulanceId   String?   @unique
  isAvailable   Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  deletedAt     DateTime?

  user       User       @relation(fields: [userId], references: [id])
  ambulance  Ambulance? @relation(fields: [ambulanceId], references: [id])
  dispatches Dispatch[]

  @@index([isAvailable])
  @@index([deletedAt])
}

model Hospital {
  id        String    @id @default(uuid())
  name      String
  address   String
  lat       Float?
  lng       Float?
  phone     String
  capacity  Int?
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  deletedAt DateTime?

  dispatches Dispatch[]

  @@index([name])
  @@index([deletedAt])
}

model Dispatch {
  id           String         @id @default(uuid())
  requestId    String         @unique
  ambulanceId  String
  driverId     String
  hospitalId   String?
  status       DispatchStatus @default(DISPATCHED)
  dispatchedAt DateTime       @default(now())
  completedAt  DateTime?
  updatedAt    DateTime       @updatedAt

  request        EmergencyRequest @relation(fields: [requestId], references: [id])
  ambulance      Ambulance        @relation(fields: [ambulanceId], references: [id])
  driver         Driver           @relation(fields: [driverId], references: [id])
  hospital       Hospital?        @relation(fields: [hospitalId], references: [id])
  tripStatusLogs TripStatusLog[]

  @@index([status])
  @@index([ambulanceId])
  @@index([driverId])
}

model TripStatusLog {
  id              String         @id @default(uuid())
  dispatchId      String
  status          DispatchStatus
  note            String?
  updatedByUserId String
  createdAt       DateTime       @default(now())

  dispatch    Dispatch @relation(fields: [dispatchId], references: [id])
  updatedBy   User     @relation(fields: [updatedByUserId], references: [id])

  @@index([dispatchId])
  @@index([createdAt])
}

model Payment {
  id           String         @id @default(uuid())
  requestId    String         @unique
  amount       Float
  currency     String         @default("BDT")
  gateway      PaymentGateway
  gatewayTxnId String?        @unique
  sessionId    String?
  status       PaymentStatus  @default(PENDING)
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  request EmergencyRequest @relation(fields: [requestId], references: [id])

  @@index([status])
  @@index([gatewayTxnId])
}

model AuditLog {
  id         String   @id @default(uuid())
  actorId    String
  action     String
  entityType String
  entityId   String
  metadata   Json?
  createdAt  DateTime @default(now())

  actor User @relation(fields: [actorId], references: [id])

  @@index([actorId])
  @@index([entityType])
  @@index([createdAt])
}
```

**📝 Commit #4:**
```
feat: add complete Prisma schema with all entities, enums, relations, and indexes
```

---

## 🔴 Step 7 — Run Migration & Database Seeding (15 min)

### 1. Run initial migration
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 2. Create seed script `src/prisma/seed.ts`
```ts
import { PrismaClient, Role, AmbulanceType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  // 1. Admin
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ambulance.dev' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@ambulance.dev',
      passwordHash: await hash('Admin@123'),
      role: Role.ADMIN,
      phone: '01700000001',
    },
  });

  // 2. Driver user
  const driverUser = await prisma.user.upsert({
    where: { email: 'driver1@ambulance.dev' },
    update: {},
    create: {
      name: 'Driver One',
      email: 'driver1@ambulance.dev',
      passwordHash: await hash('Driver@123'),
      role: Role.DRIVER,
      phone: '01700000002',
    },
  });

  // 3. Patient user
  await prisma.user.upsert({
    where: { email: 'patient1@ambulance.dev' },
    update: {},
    create: {
      name: 'Patient One',
      email: 'patient1@ambulance.dev',
      passwordHash: await hash('Patient@123'),
      role: Role.PATIENT,
      phone: '01700000003',
    },
  });

  // 4. Ambulances
  const ambulance1 = await prisma.ambulance.upsert({
    where: { vehicleNumber: 'AMB-001' },
    update: {},
    create: { vehicleNumber: 'AMB-001', type: AmbulanceType.ADVANCED_LIFE_SUPPORT, make: 'Toyota HiAce', year: 2023 },
  });

  await prisma.ambulance.upsert({
    where: { vehicleNumber: 'AMB-002' },
    update: {},
    create: { vehicleNumber: 'AMB-002', type: AmbulanceType.BASIC, make: 'Ford Transit', year: 2022 },
  });

  await prisma.ambulance.upsert({
    where: { vehicleNumber: 'AMB-003' },
    update: {},
    create: { vehicleNumber: 'AMB-003', type: AmbulanceType.INTENSIVE_CARE, make: 'Mercedes Sprinter', year: 2024 },
  });

  // 5. Driver Profile
  await prisma.driver.upsert({
    where: { userId: driverUser.id },
    update: {},
    create: {
      userId: driverUser.id,
      licenseNumber: 'DL-2024-001',
      ambulanceId: ambulance1.id,
    },
  });

  // 6. Hospitals
  await prisma.hospital.createMany({
    skipDuplicates: true,
    data: [
      { name: 'Dhaka Medical College Hospital', address: 'Secretariat Rd, Dhaka', phone: '02-55165000', capacity: 50 },
      { name: 'Square Hospital', address: '18/F Bir Uttam Qazi Nuruzzaman Sarak, Dhaka', phone: '02-8159457', capacity: 30 },
      { name: 'Evercare Hospital', address: 'Plot 81, Block E, Bashundhara R/A, Dhaka', phone: '02-8431661', capacity: 40 },
    ],
  });

  console.log('✅ Seed data successfully created:');
  console.log('   Admin:   admin@ambulance.dev / Admin@123');
  console.log('   Driver:  driver1@ambulance.dev / Driver@123');
  console.log('   Patient: patient1@ambulance.dev / Patient@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

### 3. Run the seed command
```bash
npm run db:seed
```

**📝 Commit #5:**
```
feat: add database migrations and seed data with admin, driver, patient, ambulances, hospitals
```

---

## 🔴 Step 8 — Set Up Deployment Skeleton on Render (20 min)

1. Go to **[Render.com](https://render.com)** -> Create a **New Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Add environment variables (from `.env.example`, especially `DATABASE_URL`, `PORT=10000`, `NODE_ENV=production`).
5. Trigger initial deploy -> Verify `/health` on the live Render URL.

**📝 Commit #6:**
```
chore: add render deployment config and production env setup
```

---

## 🎯 Day 1 Deliverables Summary

- [ ] Repository created & linked with Git
- [ ] TypeScript, Express, Prisma, Zod, and security dependencies set up
- [ ] Modular folder structure in place
- [ ] Express app with health endpoint & error handling running locally
- [ ] PostgreSQL connected on Neon & full Prisma schema migrated
- [ ] Seed data populated with 3 test accounts & resources
- [ ] Initial skeleton live on Render with functioning `/health`
- [ ] 6 clean, semantic Git commits pushed
