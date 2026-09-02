import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { errorHandler } from "./middlewares/errorHandler.middleware";

const app = express();

// Security & Headers
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL ?? "*", credentials: true }));

// Rate limiting (100 requests per 15 min window)
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// Body parsing
app.use(express.json());

// Health Check Endpoint
app.get("/health", (_req, res) => {
	res.json({
		success: true,
		message: "Ambulance Dispatch API is healthy and running",
	});
});

// Centralized error handling (must be last)
app.use(errorHandler);

export default app;
