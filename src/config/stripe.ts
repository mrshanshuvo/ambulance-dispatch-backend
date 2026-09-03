import Stripe from "stripe";
import { envConfig } from "./env";

if (!envConfig.stripe.secretKey) {
  throw new Error("STRIPE_SECRET_KEY is not configured");
}

export const stripe = new Stripe(envConfig.stripe.secretKey, {
  apiVersion: "2026-08-26.dahlia",
});
