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
              secure_url: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
              public_id: "sample_id",
            });
          }),
        };
        return stream;
      }),
    },
  },
}));
