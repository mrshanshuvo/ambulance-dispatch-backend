import bcrypt from "bcrypt";
import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../src/app";
import { prisma } from "../../src/config/db";

describe("Admin Module Integration Tests", () => {
  const timestamp = Date.now();
  let adminToken = "";
  let adminUserId = "";
  let patientToken = "";
  let targetUserId = "";

  it("Setup: Create Admin and Patient accounts", async () => {
    const passwordHash = await bcrypt.hash("Password123", 12);

    const adminUser = await prisma.user.create({
      data: {
        name: `Admin Status Tester ${timestamp}`,
        email: `admin_status_${timestamp}@example.com`,
        passwordHash,
        role: "ADMIN",
      },
    });
    adminUserId = adminUser.id;

    const adminLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: adminUser.email, password: "Password123" });
    adminToken = adminLogin.body.data.accessToken;

    const patientUser = await prisma.user.create({
      data: {
        name: `Target Status User ${timestamp}`,
        email: `target_status_${timestamp}@example.com`,
        passwordHash,
        role: "PATIENT",
        isActive: true,
      },
    });
    targetUserId = patientUser.id;

    const patientLogin = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: patientUser.email, password: "Password123" });
    patientToken = patientLogin.body.data.accessToken;

    expect(adminToken).toBeDefined();
    expect(patientToken).toBeDefined();
  });

  describe("PATCH /api/v1/admin/users/:id/status", () => {
    it("Admin can deactivate a user account", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);
      expect(res.body.message).toContain("deactivated");

      // Verify in DB
      const userInDb = await prisma.user.findUnique({
        where: { id: targetUserId },
      });
      expect(userInDb?.isActive).toBe(false);

      // Verify audit log
      const auditLog = await prisma.auditLog.findFirst({
        where: {
          entityType: "User",
          entityId: targetUserId,
          action: "UPDATE_STATUS",
        },
      });
      expect(auditLog).toBeDefined();
      expect(auditLog?.actorId).toBe(adminUserId);
    });

    it("Admin can reactivate a user account", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(true);
      expect(res.body.message).toContain("activated");
    });

    it("Cannot deactivate own account", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${adminUserId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain("cannot deactivate your own account");
    });

    it("Rejects non-boolean isActive value", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: "yes" });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it("Returns 404 for non-existent user", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";
      const res = await request(app)
        .patch(`/api/v1/admin/users/${nonExistentId}/status`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it("Rejects non-admin users with 403", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .set("Authorization", `Bearer ${patientToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(403);
    });

    it("Rejects unauthenticated requests with 401", async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/users/${targetUserId}/status`)
        .send({ isActive: false });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/v1/admin/audit-logs", () => {
    it("Admin can filter audit logs by ?action= and ?entityType=", async () => {
      const res = await request(app)
        .get("/api/v1/admin/audit-logs?action=UPDATE_STATUS&entityType=User")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.logs)).toBe(true);
      expect(res.body.data.meta).toBeDefined();

      for (const log of res.body.data.logs) {
        expect(log.action).toBe("UPDATE_STATUS");
        expect(log.entityType).toBe("User");
      }
    });
  });
});
