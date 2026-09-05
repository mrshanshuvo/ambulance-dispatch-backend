import { envConfig } from "../config/env";
import { AppError } from "../utils/AppError";

interface SSLCommerzInitResponse {
  status: string;
  failedreason?: string;
  sessionkey: string;
  GatewayPageURL: string;
  redirectGatewayURL?: string;
}

interface SSLCommerzValidationResponse {
  status: string;
  tran_id: string;
  val_id: string;
  amount: string;
  card_type?: string;
  store_amount?: string;
  card_no?: string;
  bank_tran_id?: string;
  currency: string;
  tran_date: string;
  error?: string;
}

/**
 * Initialize SSLCommerz Payment Session (Hosted Gateway)
 */
export const initSSLCommerzPayment = async (params: {
  amount: number;
  requestId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
}): Promise<SSLCommerzInitResponse> => {
  const backendBaseUrl =
    process.env.NODE_ENV === "production"
      ? "https://ambulance-dispatch-backend-66f2.onrender.com"
      : `http://localhost:${envConfig.port}`;

  const tranId = `SSL-${params.requestId.slice(0, 8)}-${Date.now().toString().slice(-4)}`;

  const bodyData = new URLSearchParams({
    store_id: envConfig.sslcommerz.storeId,
    store_passwd: envConfig.sslcommerz.storePassword,
    total_amount: params.amount.toFixed(2),
    currency: "BDT",
    tran_id: tranId,
    success_url: `${backendBaseUrl}/api/v1/payments/sslcommerz/success?requestId=${params.requestId}`,
    fail_url: `${backendBaseUrl}/api/v1/payments/sslcommerz/fail?requestId=${params.requestId}`,
    cancel_url: `${backendBaseUrl}/api/v1/payments/sslcommerz/cancel?requestId=${params.requestId}`,
    ipn_url: `${backendBaseUrl}/api/v1/payments/sslcommerz/ipn`,
    value_a: params.requestId,
    shipping_method: "NO",
    product_name: "Emergency Ambulance Service",
    product_category: "Healthcare",
    product_profile: "general",
    cus_name: params.customerName || "Emergency Patient",
    cus_email: params.customerEmail || "patient@example.com",
    cus_add1: params.customerAddress || "Dhaka, Bangladesh",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    cus_phone: params.customerPhone || "01700000000",
  });

  const response = await fetch(envConfig.sslcommerz.sessionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: bodyData.toString(),
  });

  const data = (await response.json()) as SSLCommerzInitResponse;

  if (data.status !== "SUCCESS" || !data.GatewayPageURL) {
    throw new AppError(
      `SSLCommerz Session Failed: ${data.failedreason || "Unable to generate payment URL"}`,
      502,
    );
  }

  return data;
};

/**
 * Validate SSLCommerz Transaction using Order Validation API
 */
export const validateSSLCommerzPayment = async (
  valId: string,
): Promise<SSLCommerzValidationResponse> => {
  const queryUrl = `${envConfig.sslcommerz.validationUrl}?val_id=${encodeURIComponent(valId)}&store_id=${encodeURIComponent(envConfig.sslcommerz.storeId)}&store_passwd=${encodeURIComponent(envConfig.sslcommerz.storePassword)}&v=1&format=json`;

  const response = await fetch(queryUrl, {
    method: "GET",
  });

  const data = (await response.json()) as SSLCommerzValidationResponse;

  if (data.status !== "VALID" && data.status !== "VALIDATED") {
    throw new AppError(
      `SSLCommerz Validation Failed: ${data.error || "Payment was not valid"}`,
      400,
    );
  }

  return data;
};
