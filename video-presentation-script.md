# 🎬 Video Presentation Script: Emergency Ambulance Dispatch System

**Target Duration:** 7 – 9 minutes  
**Language:** English (Clear, confident, conversational)  
**Tools open before starting:**

1. Browser showing **GitHub Repo & Live URL /health**
2. **VS Code** showing clean project architecture (`src/modules`)
3. **Postman** with the imported collection `Emergency Ambulance Dispatch System API`

---

## ⏱️ Timeline Cheat-Sheet

| Timestamp       | Topic                                                     | Screen / Tool                   |
| :-------------- | :-------------------------------------------------------- | :------------------------------ |
| **0:00 – 1:15** | 1. Introduction & Clean Architecture                      | Browser & VS Code               |
| **1:15 – 2:45** | 2. Three Roles & RBAC Protection (403 Demo)               | Postman                         |
| **2:45 – 4:00** | 3. Core Workflow & CRUD (Dispatch Engine)                 | Postman                         |
| **4:00 – 5:15** | 4. Zod Validation & Global Error Handling (422, 401, 404) | Postman                         |
| **5:15 – 6:45** | 5. Payment Flow (Stripe, bKash & SSLCommerz)              | Postman & Browser               |
| **6:45 – 8:00** | 6. Technical Challenge Solved (Double-Booking & Redis)    | VS Code (`dispatch.service.ts`) |
| **8:00 – 8:30** | 7. Automated Testing Suite & Conclusion                   | Terminal (`npm test`)           |

---

## 🎬 Part 1: Project Overview & Architecture (0:00 – 1:15)

### 🖥️ On Screen:

> Open the browser on the deployed URL: `https://ambulance-dispatch-backend-66f2.onrender.com/health` and then switch to VS Code folder structure.

### 🗣️ What to Say:

> "Hello everyone! Welcome to the demonstration of the **Emergency Ambulance Dispatch System Backend API**.
>
> In high-stress medical emergencies, seconds matter. A delayed or disorganized dispatch can cost lives. This backend solves that critical problem by providing an automated, atomic dispatch engine that pairs patients in distress with the closest available ambulance and driver, transitions through a 6-stage trip status machine, and processes medical transportation fares through multi-channel payment gateways.
>
> The project is deployed live on **Render**, backed by a serverless PostgreSQL database on **Neon**, with **Redis Cloud** for performance caching.
>
> _(Switch to VS Code)_  
> Looking at the codebase, I followed the industry-standard **Clean Layered Modular Architecture**:
>
> - Each feature lives in its own module inside `src/modules`—like `auth`, `ambulance`, `driver`, `dispatch`, and `payment`.
> - The flow strictly follows **Routes → Middlewares (Auth, RBAC, Validation) → Controllers → Services → Prisma ORM**.
> - Services handle pure business logic, keeping controllers lean and highly testable."

---

## 🎬 Part 2: Demonstrate All 3 Roles & RBAC (1:15 – 2:45)

### 🖥️ On Screen:

> Open **Postman**. Go to folder `01. Auth Module`.

### 🗣️ What to Say:

> "Our system enforces strict **Role-Based Access Control** with three distinct roles:
>
> 1. **PATIENT**: The public caller requesting help.
> 2. **DRIVER**: The first responder navigating the ambulance.
> 3. **ADMIN**: The central dispatcher and fleet manager.
>
> Let's test this in Postman.
>
> First, I will login as **ADMIN** (`admin@ambulance.dev` with `Admin@123`).  
> _(Click Send on 'Admin Login')_  
> Notice that the test script instantly captures the JWT Access Token and stores it in our Postman collection variables.
>
> Now, as an Admin, I can view system dashboard analytics:  
> _(Send 'GET /api/v1/admin/stats')_  
> We get our full fleet overview with cached responses from Redis.
>
> Next, let's login as a **PATIENT** (`patient1@ambulance.dev`).  
> _(Click Send on 'Patient Login')_  
> Now the collection variable holds the Patient's token.
>
> Now, what happens if this Patient maliciously tries to call an Admin endpoint, like accessing all users or toggling user status?  
> _(Send 'GET /api/v1/admin/users' or 'PATCH /api/v1/admin/users/:id/status')_  
> **Boom: HTTP 403 Forbidden.** Our `authorize('ADMIN')` middleware intercepts the request and safely blocks unauthorized role escalation."

---

## 🎬 Part 3: Demonstrate CRUD & Core Dispatch Flow (2:45 – 4:00)

### 🖥️ On Screen:

> Postman: `06. Emergency Request Module` → `07. Dispatch Module`.

### 🗣️ What to Say:

> "Now let's demonstrate meaningful CRUD operations across the core dispatch lifecycle.
>
> **Step 1: Patient creates an Emergency Request.**  
> _(Open 'Create Emergency Request', send)_  
> The patient sends their pickup coordinates and priority: `CRITICAL`. We receive a **201 Created** with the generated `requestId`.
>
> **Step 2: Admin Dispatches Ambulance & Driver.**  
> _(Login as Admin or switch to Admin token, then send 'Dispatch Ambulance')_  
> Here, the Admin assigns an ambulance and a driver. In a single atomic database operation, the request status becomes `DISPATCHED`, and both the ambulance and driver availability statuses are locked.
>
> **Step 3: Driver Views & Advances Trip Status.**  
> _(Login as Driver `driver1@ambulance.dev`, send 'Get Driver Active Dispatch')_  
> The driver can immediately fetch their ongoing active trip without digging through logs.
>
> Then, the driver updates trip progression:  
> _(Send 'Update Trip Status' with `status: EN_ROUTE`, then `PATIENT_PICKUP`, then `COMPLETED`)_  
> Each transition writes to our `TripStatusLog` timeline table, providing complete accountability."

---

## 🎬 Part 4: Validation & Structured Error Handling (4:00 – 5:15)

### 🖥️ On Screen:

> Postman: Intentionally send bad requests.

### 🗣️ What to Say:

> "A production-grade API must fail gracefully and provide readable feedback. We use **Zod** for schema validation on request bodies, params, and query filters.
>
> Let's test a validation failure intentionally:  
> _(Open 'Register User', change email to `"not-an-email"`, or send a dispatch with invalid status)_  
> _(Click Send)_  
> Look at the response: **HTTP 422 Unprocessable Entity**. It returns a clean JSON error structure with the specific field that failed and a human-readable message.
>
> Let's test an authentication failure:  
> _(Remove or corrupt Bearer token in headers, send request)_  
> We receive **HTTP 401 Unauthorized: Invalid or expired token**.
>
> And if someone queries a resource that doesn't exist:  
> _(Send request with a non-existent UUID)_  
> We receive **HTTP 404 Not Found**. All errors are funneled through our centralized Express error handling middleware."

---

## 🎬 Part 5: Multi-Gateway Payment Flow (5:15 – 6:45)

### 🖥️ On Screen:

> Postman: `09. Payment Module` + browser tab for Stripe / bKash.

### 🗣️ What to Say:

> "Now let's look at the financial settlement. Once a trip is completed, the patient needs to pay. We support a **Tri-Gateway architecture**: Stripe for international cards, bKash Tokenized Checkout, and SSLCommerz for local Bangladesh payments.
>
> Let's look at the **Dynamic Fare Estimate**:  
> _(Send 'GET /api/v1/payments/fare/:requestId')_  
> The system calculates the base fare, ambulance type surcharge, and distance-based rate.
>
> Now, let's initiate a **Stripe Checkout**:  
> _(Send 'POST /api/v1/payments/stripe/checkout')_  
> The API creates a payment record in `PENDING` state and returns a hosted Stripe `checkoutUrl`.  
> _(Open checkoutUrl in browser, show test card entry)_  
> When the checkout completes, Stripe sends an event to our signed webhook endpoint `/api/v1/payments/stripe/webhook`, which cryptographically validates the Stripe signature, marks the payment `SUCCESS`, and updates the emergency request to `COMPLETED`.
>
> In addition, we have full implementations for **bKash Tokenized Checkout** (`/bkash/create` and `/bkash/execute`) and **SSLCommerz** (`/sslcommerz/initiate` and IPN listener)."

---

## 🎬 Part 6: Technical Challenge Solved (6:45 – 8:00)

### 🖥️ On Screen:

> Switch to VS Code: Open `src/modules/dispatch/dispatch.service.ts` around line 20-60.

### 🗣️ What to Say:

> "Now I'd like to highlight one of the most interesting technical challenges I solved: **Preventing Race Conditions & Double-Booking in Emergency Dispatch**.
>
> In an emergency system, two dispatchers might simultaneously attempt to assign the same advanced life support ambulance to two different emergencies. If not handled atomically, you get double-booking, which can have catastrophic real-world consequences.
>
> Here in `dispatch.service.ts`, we solved this using **Prisma's Interactive Database Transactions**:
>
> 1. Inside `prisma.$transaction`, we verify that the Ambulance exists, is `AVAILABLE`, and has no active dispatch.
> 2. We verify that the Driver is marked `isAvailable: true`.
> 3. We create the `Dispatch` record, generate the initial `TripStatusLog`, update the `EmergencyRequest` to `DISPATCHED`, mark the `Ambulance` as `DISPATCHED`, and set `driver.isAvailable` to `false`—**all inside a single ACID database transaction**.
>
> If any condition fails, the entire transaction rolls back cleanly, guaranteeing zero double-allocations.
>
> On top of that, we integrated **Redis Cloud** caching on the analytics endpoint `/api/v1/admin/stats` with a 60-second TTL and automatic database fallback, ensuring high throughput under heavy traffic."

---

## 🎬 Part 7: Automated Tests & Conclusion (8:00 – 8:30)

### 🖥️ On Screen:

> Switch to VS Code integrated terminal and run `npm test`.

### 🗣️ What to Say:

> "Finally, let's look at the testing suite.  
> _(Run `npm test` in the terminal)_  
> We have **65 automated test cases** written in **Vitest**, covering unit tests, controller validators, integration tests with a live database, and full End-to-End emergency lifecycle simulations.
>
> Everything passes with 100% green status, zero TypeScript warnings, and clean Biome linting.
>
> To conclude: This backend delivers a resilient, secure, and production-ready solution for emergency ambulance logistics. Thank you for your time and review!"

---

### 🎯 Pro-Tips Before You Hit Record:

1. **Resolution:** Set your screen recording to 1080p (1920x1080).
2. **Audio:** Do a 15-second mic check to make sure your voice is clear and not echoing.
3. **Pacing:** Keep a steady, confident pace. Don't rush; pause for half a second when switching tabs.
4. **Link Sharing:** When uploading to Google Drive or Loom, verify the link is accessible in an Incognito window!
