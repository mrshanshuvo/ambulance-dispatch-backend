import bcrypt from "bcrypt";
import request from "supertest";
import { describe, expect, it } from "vitest";
import app from "../../src/app";
import { prisma } from "../../src/config/db";

describe("Emergency Ambulance Dispatch Lifecycle (E2E)", () => {
  const timestamp = Date.now();
  const testPatient = {
    name: `Patient E2E ${timestamp}`,
    email: `patient_${timestamp}@example.com`,
    password: "Password123",
    phone: "+8801700000001",
    address: "Mirpur 10, Dhaka",
  };

  const testAdmin = {
    name: `Admin E2E ${timestamp}`,
    email: `admin_${timestamp}@example.com`,
    password: "Password123",
  };

  let patientToken = "";
  let adminToken = "";
  let ambulanceId = "";
  let driverId = "";
  let requestId = "";
  let dispatchId = "";

  it("Step 1: Register and login PATIENT and ADMIN users", async () => {
    // 1.1 Register patient
    const regRes = await request(app)
      .post("/api/v1/auth/register")
      .send(testPatient);
    expect(regRes.status).toBe(201);
    expect(regRes.body.data.user.email).toBe(testPatient.email);

    // 1.2 Login patient
    const loginPatientRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testPatient.email, password: testPatient.password });
    expect(loginPatientRes.status).toBe(200);
    patientToken = loginPatientRes.body.data.accessToken;
    expect(patientToken).toBeDefined();

    // 1.3 Create Admin directly with hashed password for testing
    const passwordHash = await bcrypt.hash(testAdmin.password, 12);
    const adminUser = await prisma.user.create({
      data: {
        name: testAdmin.name,
        email: testAdmin.email,
        passwordHash,
        role: "ADMIN",
      },
    });
    expect(adminUser.role).toBe("ADMIN");

    const loginAdminRes = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: testAdmin.email, password: testAdmin.password });
    expect(loginAdminRes.status).toBe(200);
    adminToken = loginAdminRes.body.data.accessToken;
    expect(adminToken).toBeDefined();
  });

  it("Step 2: Admin sets up Ambulance and Driver resources", async () => {
    // 2.1 Create an ambulance
    const ambRes = await request(app)
      .post("/api/v1/ambulances")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        vehicleNumber: `DHK-${timestamp.toString().slice(-4)}`,
        type: "INTENSIVE_CARE",
        make: "Toyota HiAce ICU",
        year: 2024,
      });
    expect(ambRes.status).toBe(201);
    ambulanceId = ambRes.body.data.id;
    expect(ambulanceId).toBeDefined();

    // 2.2 Create a driver user and register driver
    const driverUser = await prisma.user.create({
      data: {
        name: `Driver ${timestamp}`,
        email: `driver_${timestamp}@example.com`,
        role: "DRIVER",
      },
    });

    const driverRes = await request(app)
      .post("/api/v1/drivers")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        userId: driverUser.id,
        licenseNumber: `LIC-${timestamp}`,
      });
    expect(driverRes.status).toBe(201);
    driverId = driverRes.body.data.id;
    expect(driverId).toBeDefined();
  });

  it("Step 3: Patient creates an Emergency Request", async () => {
    const reqRes = await request(app)
      .post("/api/v1/requests")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        priority: "CRITICAL",
        pickupAddress: "House 12, Road 4, Dhanmondi, Dhaka",
        description: "Patient is experiencing severe chest pain",
      });

    expect(reqRes.status).toBe(201);
    requestId = reqRes.body.data.id;
    expect(requestId).toBeDefined();
    expect(reqRes.body.data.status).toBe("PENDING");
  });

  it("Step 4: Admin Dispatches Ambulance & Driver to the Emergency Request", async () => {
    const dispatchRes = await request(app)
      .post("/api/v1/dispatches")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        requestId,
        ambulanceId,
        driverId,
      });

    expect(dispatchRes.status).toBe(201);
    dispatchId = dispatchRes.body.data.id;
    expect(dispatchId).toBeDefined();
    expect(dispatchRes.body.data.status).toBe("DISPATCHED");

    // Verify request status transitioned to DISPATCHED
    const reqCheck = await prisma.emergencyRequest.findUnique({
      where: { id: requestId },
    });
    expect(reqCheck?.status).toBe("DISPATCHED");

    // Verify Ambulance is marked DISPATCHED
    const ambCheck = await prisma.ambulance.findUnique({
      where: { id: ambulanceId },
    });
    expect(ambCheck?.status).toBe("DISPATCHED");

    // Verify Driver is marked unavailable
    const driverCheck = await prisma.driver.findUnique({
      where: { id: driverId },
    });
    expect(driverCheck?.isAvailable).toBe(false);
  });

  it("Step 5: Advance trip status through lifecycle to COMPLETED", async () => {
    // 5.1 Update to EN_ROUTE
    const status1 = await request(app)
      .patch(`/api/v1/dispatches/${dispatchId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "EN_ROUTE",
        note: "Ambulance on the way",
      });
    expect(status1.status).toBe(200);

    // 5.2 Update to COMPLETED
    const status2 = await request(app)
      .patch(`/api/v1/dispatches/${dispatchId}/status`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        status: "COMPLETED",
        note: "Patient delivered to emergency room",
      });
    expect(status2.status).toBe(200);

    // Verify ambulance & driver automatically restored to AVAILABLE
    const ambCheck = await prisma.ambulance.findUnique({
      where: { id: ambulanceId },
    });
    expect(ambCheck?.status).toBe("AVAILABLE");

    const driverCheck = await prisma.driver.findUnique({
      where: { id: driverId },
    });
    expect(driverCheck?.isAvailable).toBe(true);
  });

  it("Step 6: Patient initiates payment checkout & views payment status", async () => {
    const payRes = await request(app)
      .post("/api/v1/payments/checkout")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        requestId,
        amount: 2500,
        currency: "bdt",
      });

    expect(payRes.status).toBe(201);
    expect(payRes.body.data.checkoutUrl).toBeDefined();
    expect(payRes.body.data.sessionId).toBeDefined();

    // Fetch payment status
    const statusRes = await request(app)
      .get(`/api/v1/payments/${requestId}`)
      .set("Authorization", `Bearer ${patientToken}`);

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.status).toBe("PENDING");
    expect(statusRes.body.data.amount).toBe(2500);
  });
});
