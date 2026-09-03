import { envConfig } from "../config/env";
import { AppError } from "../utils/AppError";

interface BkashGrantTokenResponse {
  statusCode: string;
  statusMessage: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

interface BkashCreatePaymentResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  bkashURL: string;
  callbackURL: string;
  amount: string;
  intent: string;
  currency: string;
  paymentCreateTime: string;
  transactionStatus: string;
  merchantInvoiceNumber: string;
}

interface BkashExecutePaymentResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  trxID: string;
  amount: string;
  transactionStatus: string;
  paymentExecuteTime: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
}

interface BkashQueryPaymentResponse {
  statusCode: string;
  statusMessage: string;
  paymentID: string;
  trxID: string;
  amount: string;
  transactionStatus: string;
  paymentCreateTime: string;
  paymentExecuteTime: string;
  currency: string;
  intent: string;
  merchantInvoiceNumber: string;
}

let cachedIdToken: string | null = null;
let tokenExpiryTime = 0;

/**
 * Obtain or reuse a valid bKash Bearer id_token
 */
export const getBkashIdToken = async (): Promise<string> => {
  const now = Date.now();
  if (cachedIdToken && now < tokenExpiryTime) {
    return cachedIdToken;
  }

  const response = await fetch(
    `${envConfig.bkash.baseUrl}/tokenized/checkout/token/grant`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        username: envConfig.bkash.username,
        password: envConfig.bkash.password,
      },
      body: JSON.stringify({
        app_key: envConfig.bkash.appKey,
        app_secret: envConfig.bkash.appSecret,
      }),
    },
  );

  const data = (await response.json()) as BkashGrantTokenResponse;

  if (data.statusCode !== "0000" || !data.id_token) {
    throw new AppError(
      `bKash Authentication Failed: ${data.statusMessage || "Invalid Credentials"}`,
      502,
    );
  }

  cachedIdToken = data.id_token;
  // Expire 60 seconds before actual token expiry
  tokenExpiryTime = now + (data.expires_in - 60) * 1000;

  return cachedIdToken;
};

/**
 * Create a Tokenized bKash Checkout Payment
 */
export const createBkashPayment = async (params: {
  amount: number;
  requestId: string;
  payerReference?: string;
}): Promise<BkashCreatePaymentResponse> => {
  const idToken = await getBkashIdToken();

  const response = await fetch(
    `${envConfig.bkash.baseUrl}/tokenized/checkout/create`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: idToken,
        "x-app-key": envConfig.bkash.appKey,
      },
      body: JSON.stringify({
        mode: "0011",
        payerReference: params.payerReference || "01770618575",
        callbackURL: envConfig.bkash.callbackUrl,
        amount: params.amount.toFixed(2),
        currency: "BDT",
        intent: "sale",
        merchantInvoiceNumber: `INV-${params.requestId.slice(0, 8)}-${Date.now().toString().slice(-4)}`,
      }),
    },
  );

  const data = (await response.json()) as BkashCreatePaymentResponse;

  if (data.statusCode !== "0000" || !data.bkashURL) {
    throw new AppError(
      `bKash Payment Creation Failed: ${data.statusMessage || "Unknown error"}`,
      502,
    );
  }

  return data;
};

/**
 * Execute/Capture a bKash Payment after user OTP & PIN confirmation
 */
export const executeBkashPayment = async (
  paymentID: string,
): Promise<BkashExecutePaymentResponse> => {
  const idToken = await getBkashIdToken();

  const response = await fetch(
    `${envConfig.bkash.baseUrl}/tokenized/checkout/execute`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: idToken,
        "x-app-key": envConfig.bkash.appKey,
      },
      body: JSON.stringify({ paymentID }),
    },
  );

  const data = (await response.json()) as BkashExecutePaymentResponse;

  if (data.statusCode !== "0000" || data.transactionStatus !== "Completed") {
    throw new AppError(
      `bKash Execution Failed: ${data.statusMessage || "Payment was not completed"}`,
      400,
    );
  }

  return data;
};

/**
 * Query bKash Payment status
 */
export const queryBkashPayment = async (
  paymentID: string,
): Promise<BkashQueryPaymentResponse> => {
  const idToken = await getBkashIdToken();

  const response = await fetch(
    `${envConfig.bkash.baseUrl}/tokenized/checkout/payment/status`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: idToken,
        "x-app-key": envConfig.bkash.appKey,
      },
      body: JSON.stringify({ paymentID }),
    },
  );

  const data = (await response.json()) as BkashQueryPaymentResponse;
  return data;
};
