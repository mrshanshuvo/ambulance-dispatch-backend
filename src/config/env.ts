import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export const envConfig = {
  env: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  clientUrl: process.env.CLIENT_URL || "http://localhost:3000",
  docsUrl:
    process.env.DOCS_URL ||
    "https://github.com/mrshanshuvo/ambulance-dispatch-backend#readme",
  databaseUrl: process.env.DATABASE_URL,
  jwt: {
    secret: process.env.JWT_SECRET || "your-jwt-secret",
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    refreshSecret: process.env.JWT_REFRESH_SECRET || "your-jwt-refresh-secret",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d",
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    callbackUrl:
      process.env.GOOGLE_CALLBACK_URL ||
      "http://localhost:5000/api/v1/auth/google/callback",
  },
  stripe: {
    secretKey: process.env.STRIPE_SECRET_KEY || "",
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || "",
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
    apiKey: process.env.CLOUDINARY_API_KEY || "",
    apiSecret: process.env.CLOUDINARY_API_SECRET || "",
  },
  redis: {
    url:
      process.env.REDIS_URL ||
      (process.env.REDIS_HOST
        ? `redis://${process.env.REDIS_USERNAME || "default"}:${process.env.REDIS_PASSWORD || ""}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}`
        : ""),
    host: process.env.REDIS_HOST || "",
    port: Number(process.env.REDIS_PORT) || 6379,
    username: process.env.REDIS_USERNAME || "default",
    password: process.env.REDIS_PASSWORD || "",
  },
} as const;
