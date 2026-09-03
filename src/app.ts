import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import "express-async-errors";
import { envConfig } from "./config/env";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import adminRoutes from "./modules/admin/admin.routes";
import ambulanceRoutes from "./modules/ambulance/ambulance.routes";
import authRoutes from "./modules/auth/auth.routes";
import dispatchRoutes from "./modules/dispatch/dispatch.routes";
import driverRoutes from "./modules/driver/driver.routes";
import hospitalRoutes from "./modules/hospital/hospital.routes";
import paymentRoutes from "./modules/payment/payment.routes";
import requestRoutes from "./modules/request/request.routes";
import userRoutes from "./modules/user/user.routes";

const app = express();

// Security & Headers
app.use(helmet());
app.use(cors({ origin: envConfig.clientUrl, credentials: true }));

// Rate limiting (100 requests per 15 min window)
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// ─── IMPORTANT: Payment webhook MUST be mounted before express.json() ────────
// Stripe needs the raw request body to verify the webhook signature.
// The /webhook sub-route inside paymentRoutes applies its own raw body parser.
app.use("/api/v1/payments", paymentRoutes);

// Body parsing (for all other routes)
app.use(express.json());

// Root Welcome / API Info Endpoint
app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Welcome to Emergency Ambulance Dispatch API",
    data: {
      name: "Emergency Ambulance Dispatch System API",
      version: "1.0.0",
      status: "online",
      environment: envConfig.env,
      healthCheck: "/health",
      documentation: envConfig.docsUrl,
    },
  });
});

// Health Check Endpoint
app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Ambulance Dispatch API is healthy and running",
  });
});

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/ambulances", ambulanceRoutes);
app.use("/api/v1/drivers", driverRoutes);
app.use("/api/v1/hospitals", hospitalRoutes);
app.use("/api/v1/requests", requestRoutes);
app.use("/api/v1/dispatches", dispatchRoutes);
app.use("/api/v1/admin", adminRoutes);

// 404 Catch-All Handler (for undefined routes)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found on this server`,
    errors: [],
  });
});

// Centralized error handling (must be last)
app.use(errorHandler);

export default app;
