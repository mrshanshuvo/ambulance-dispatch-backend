import { vi } from "vitest";

// Set default test environment variables
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-jwt-secret-key-123456789";
process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret-key-123456789";
process.env.PORT = "5001";
process.env.STRIPE_SECRET_KEY = "sk_test_mock_key";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_mock_secret";

// Global mocks
vi.mock("../src/config/cloudinary", () => ({
  cloudinary: {
    config: vi.fn(),
    uploader: {
      upload_stream: vi.fn((_opts, cb) => {
        const stream = {
          end: vi.fn((_buffer) => {
            cb(null, {
              secure_url:
                "https://res.cloudinary.com/demo/image/upload/sample.jpg",
              public_id: "sample_id",
            });
          }),
        };
        return stream;
      }),
    },
  },
}));

vi.mock("../src/config/stripe", () => ({
  stripe: {
    checkout: {
      sessions: {
        create: vi.fn(async (params) => ({
          id: `cs_test_${Date.now()}`,
          url: "https://checkout.stripe.com/c/pay/cs_test_mock_url",
          payment_method_types: params.payment_method_types,
          metadata: params.metadata,
        })),
      },
    },
    webhooks: {
      constructEvent: vi.fn((body, sig, secret) => ({
        type: "checkout.session.completed",
        data: {
          object: {
            metadata: { requestId: "mock-request-id" },
            payment_intent: "pi_mock_123456",
          },
        },
      })),
    },
  },
}));
