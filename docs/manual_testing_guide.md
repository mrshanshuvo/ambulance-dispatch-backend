# Manual Testing Guide — Emergency Ambulance Dispatch System

A step-by-step walkthrough for manually testing the entire system lifecycle using the **Postman collection** at [`docs/postman_collection.json`](file:///c:/Users/Shuvo/Desktop/B7A6/docs/postman_collection.json).

---

## ⚙️ Setup (Do This First)

1. **Start the server**: `npm run dev` (listening on `http://localhost:5000`)
2. **Import the collection** in Postman: `File → Import → docs/postman_collection.json`
3. **Create a Postman Environment** (click Environments → New) and set:
   - `baseUrl` = `http://localhost:5000`
4. **Select that environment** from the top-right dropdown in Postman.

> The collection-level pre-request script automatically refreshes your access token before it expires. All tokens and IDs are auto-saved by test scripts — you do not need to copy-paste anything manually.

---

## 📋 Workflow Sequence

### ✅ 1. System Health Check

- **Folder**: `00. System & Health` → `Health Check`
- **Method**: `GET /health`
- **Expected**: `200 OK`

---

### ✅ 2. Admin Authentication

- **Folder**: `01. Auth Module` → `01.1 Email & Password Auth` → `Login User (Admin / Driver / Patient)`
- **Body**:
  ```json
  {
    "email": "admin@ambulance.dev",
    "password": "Admin@123"
  }
  ```
- **Expected**: `200 OK`
- **Auto-saves**: `{{accessToken}}`, `{{refreshToken}}`

---

### ✅ 3. Create Ambulance (Admin)

- **Folder**: `03. Ambulance Module` → `03.2 Admin Management` → `Create Ambulance (ADMIN)`
- **Body**:
  ```json
  {
    "vehicleNumber": "DHAKA-METRO-EM-9999",
    "type": "ADVANCED_LIFE_SUPPORT",
    "make": "Toyota HiAce",
    "year": 2024
  }
  ```
- **Expected**: `201 Created`, `status: "AVAILABLE"`
- **Auto-saves**: `{{ambulanceId}}`

---

### ✅ 4. Create Driver (Admin Direct Onboarding)

- **Folder**: `08. Admin Module` → `08.1 User Administration` → `Create Driver (Admin Direct Onboarding)`
- **Body**:
  ```json
  {
    "name": "Kabir Driver",
    "email": "kabir.driver@example.com",
    "password": "Password123!",
    "phone": "+8801722233344",
    "licenseNumber": "DL-DHAKA-2024-5544"
  }
  ```
- **Expected**: `201 Created`, `user.role: "DRIVER"`, `driver.licenseNumber` present
- **Auto-saves**: `{{driverId}}`, `{{driverUserId}}`

---

### ✅ 5. Register Patient

- **Folder**: `01. Auth Module` → `01.1 Email & Password Auth` → `Register User (Patient)`
- **Body**:
  ```json
  {
    "name": "Sultana Patient",
    "email": "patient@example.com",
    "password": "Password123!",
    "phone": "+8801822334455",
    "address": "House 12, Road 27, Dhanmondi, Dhaka"
  }
  ```
- **Expected**: `201 Created`, `user.role: "PATIENT"`
- **Auto-saves**: `{{accessToken}}` ← now set to Patient token

---

### ✅ 6. Create Emergency Request (Patient)

- **Folder**: `06. Emergency Request Module` → `06.1 Patient Operations` → `Create Emergency Request (PATIENT)`
- **Body**:
  ```json
  {
    "priority": "CRITICAL",
    "pickupAddress": "House 45, Road 27, Dhanmondi, Dhaka",
    "pickupLat": 23.7465,
    "pickupLng": 90.3758,
    "description": "Severe cardiac pain, immediate life support needed"
  }
  ```
- **Expected**: `201 Created`, `status: "PENDING"`
- **Auto-saves**: `{{requestId}}`

> ⚠️ Payment is **not yet allowed** at this stage — request must reach `DISPATCHED` first.

---

### ✅ 7. Dispatch (Admin)

**Step 7.1** — Login back as Admin:
- **Folder**: `01. Auth Module` → `01.1 Email & Password Auth` → `Login User (Admin / Driver / Patient)`
- Body: `admin@ambulance.dev` / `Admin@123`
- Auto-saves Admin `{{accessToken}}`

**Step 7.2** — Create the Dispatch:
- **Folder**: `07. Dispatch Module` → `07.1 Dispatch Creation & Details` → `Create Dispatch (ADMIN)`
- **Body**:
  ```json
  {
    "requestId": "{{requestId}}",
    "ambulanceId": "{{ambulanceId}}",
    "driverId": "{{driverId}}"
  }
  ```
- **Expected**: `201 Created`
- **Auto-saves**: `{{dispatchId}}`
- **Side effects**:
  - Emergency request: `PENDING` → `DISPATCHED`
  - Ambulance: `AVAILABLE` → `DISPATCHED`
  - Driver: `isAvailable: true` → `false`

> ✅ Payment window is now **unlocked**.

---

### ✅ 8. Trip Status Updates (Driver)

Login as the Driver:
- **Folder**: `01. Auth Module` → `01.1 Email & Password Auth` → `Login User (Admin / Driver / Patient)`
- Body: `kabir.driver@example.com` / `Password123!`

Then update status in order:

**Step 8.1 — EN_ROUTE**:
- **Folder**: `07. Dispatch Module` → `07.2 Trip Status Transitions` → `Update Dispatch Status — EN_ROUTE`
- **Expected**: `200 OK`

**Step 8.2 — ON_SCENE**:
- **Folder**: `07. Dispatch Module` → `07.2 Trip Status Transitions` → `Update Dispatch Status — ON_SCENE`
- **Expected**: `200 OK`

---

### ✅ 9. Payment Processing (Patient)

Login back as Patient:
- Body: `patient@example.com` / `Password123!`

Choose one of the three gateways:

#### Option A — bKash (Sandbox, Full Flow)

**Step 9A.1** — Create Checkout URL:
- **Folder**: `09. Payment Module` → `09.3 bKash PGW (Tokenized)` → `Create bKash Checkout URL (PATIENT)`
- **Body**:
  ```json
  {
    "requestId": "{{requestId}}",
    "amount": 1500,
    "payerReference": "01770618575"
  }
  ```
- **Expected**: `201 Created`, returns `bkashURL` and `paymentID`
- **Auto-saves**: `{{bkashPaymentID}}`
- Sandbox credentials: Wallet `01770618575`, OTP `123456`, PIN `12121`

**Step 9A.2** — Execute Payment:
- **Folder**: `09. Payment Module` → `09.3 bKash PGW (Tokenized)` → `Execute bKash Payment (PATIENT)`
- **Body**:
  ```json
  {
    "paymentID": "{{bkashPaymentID}}",
    "requestId": "{{requestId}}"
  }
  ```
- **Expected**: `200 OK`, `status: "SUCCESS"`, `transactionId` present
- **Side effect**: Emergency request → `COMPLETED`

---

#### Option B — SSLCommerz (Sandbox)

- **Folder**: `09. Payment Module` → `09.4 SSLCommerz Gateway` → `Initiate SSLCommerz Session (PATIENT)`
- **Body**: `{ "requestId": "{{requestId}}" }`
- **Expected**: `201 Created`, returns `gatewayPageURL`
- Open the URL in a browser → select test card/MFS → click **Confirm Payment**
- The IPN/success callback automatically marks the request `COMPLETED`

---

#### Option C — Stripe (Sandbox)

- **Folder**: `09. Payment Module` → `09.2 Stripe Gateway` → `Create Stripe Checkout Session (PATIENT)`
- **Body**: `{ "requestId": "{{requestId}}" }`
- **Expected**: `201 Created`, returns `checkoutUrl` containing `stripe.com`
- Open the URL in a browser and use test card: `4242 4242 4242 4242`
- Requires Stripe webhook listener running locally:
  ```bash
  stripe listen --forward-to localhost:5000/api/v1/payments/stripe/webhook
  ```

---

### ✅ 10. Verify Payment Status

- **Folder**: `09. Payment Module` → `09.1 Common / Status` → `Get Payment Status (PATIENT / ADMIN)`
- **Expected**: `200 OK`, `status: "SUCCESS"`

---

### ✅ 11. Admin Dashboard Stats

Login as Admin, then:
- **Folder**: `08. Admin Module` → `08.2 System Analytics & Auditing` → `Get Dashboard Statistics (ADMIN)`
- **Expected**: Revenue incremented, completed request count updated

---

## 🚨 Error Scenario Testing

Verify that security guards and business rules are enforced:

| Test | Folder | Expected |
|---|---|---|
| Login with wrong password | `01.4 Error Scenarios` → `[Error] Login with Wrong Password` | `401 Unauthorized` |
| Register with duplicate email | `01.4 Error Scenarios` → `[Error] Register with Duplicate Email` | `409 Conflict` |
| Access route without token | `01.4 Error Scenarios` → `[Error] Access Protected Route Without Token` | `401 Unauthorized` |
| Patient accessing Admin route | `01.4 Error Scenarios` → `[Error] Patient Accessing Admin Route (RBAC)` | `403 Forbidden` |
| Pay before dispatch (PENDING request) | `09.1 Common / Status` → `[Error] Pay for PENDING Request` | `400 Bad Request` |

---

## 🔁 Re-run Checklist

If you need to re-test from scratch (e.g., after a DB reset):

- [ ] Health check passes
- [ ] Admin login succeeds and `{{accessToken}}` is set
- [ ] Ambulance created — `{{ambulanceId}}` saved
- [ ] Driver created — `{{driverId}}` saved
- [ ] Patient registered — `{{accessToken}}` set to patient token
- [ ] Emergency request created — `{{requestId}}` saved, `status: PENDING`
- [ ] Dispatch created — `{{dispatchId}}` saved, request `status: DISPATCHED`
- [ ] Payment completed — `status: SUCCESS`, request `status: COMPLETED`
- [ ] Admin stats reflect updated revenue
