import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import "express-async-errors";
import { errorHandler } from "./middlewares/errorHandler.middleware";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/user/user.routes";

const app = express();

// Security & Headers
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL ?? "*", credentials: true }));

// Rate limiting (100 requests per 15 min window)
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Body parsing
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
      environment: process.env.NODE_ENV ?? "development",
      healthCheck: "/health",
      documentation:
        process.env.DOCS_URL ??
        "https://github.com/mrshanshuvo/ambulance-dispatch-backend#readme",
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
