import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../src/app";

describe("System Health & Info API (Integration)", () => {
  it("GET /health should return 200 and healthy status", async () => {
    const res = await request(app).get("/health");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toContain("healthy");
  });

  it("GET / should return 200 with API metadata", async () => {
    const res = await request(app).get("/");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe("Emergency Ambulance Dispatch System API");
    expect(res.body.data.version).toBe("1.0.0");
  });

  it("GET /undefined-route should return structured 404 response", async () => {
    const res = await request(app).get("/api/v1/non-existent-endpoint");

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain("not found");
  });
});
