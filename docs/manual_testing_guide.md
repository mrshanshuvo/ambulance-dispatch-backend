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

### ✅ 3.1. Create Hospital (Admin)

- **Folder**: `05. Hospital Module` → `05.2 Admin Management` → `Create Hospital (ADMIN)`
- **Body**:
  ```json
  {
    "name": "Apollo Specialized Hospital",
    "address": "Plot 81, Block E, Bashundhara R/A, Dhaka",
    "phone": "+8801811223344",
    "capacity": 60
  }
  ```
- **Expected**: `201 Created`
- **Auto-saves**: `{{hospitalId}}` (used in Step 8.3 for destination selection)

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
- **Expected**: `201 Created`, `data.licenseNumber`, `data.user.role: "DRIVER"`
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

**Step 8.1 — EN_ROUTE**:

- **Folder**: `07. Dispatch Module` → `07.2 Trip Status Transitions` → `Update Dispatch Status — EN_ROUTE`
- **Expected**: `200 OK`

**Step 8.2 — PATIENT_PICKUP**:

- **Folder**: `07. Dispatch Module` → `07.2 Trip Status Transitions` → `Update Dispatch Status — PATIENT_PICKUP`
- **Expected**: `200 OK`

**Step 8.3 — HOSPITAL_SELECTED (Select Destination Hospital)**:

- **Folder**: `07. Dispatch Module` → `07.2 Trip Status Transitions` → `Update Dispatch Status — HOSPITAL_SELECTED`
- **Body**:
  ```json
  {
    "status": "HOSPITAL_SELECTED",
    "hospitalId": "{{hospitalId}}",
    "note": "Patient assessed; en route to designated emergency hospital"
  }
  ```
- **Expected**: `200 OK`, `hospitalId` assigned to the dispatch

**Step 8.4 — HOSPITAL_ARRIVAL**:

- **Folder**: `07. Dispatch Module` → `07.2 Trip Status Transitions` → `Update Dispatch Status — HOSPITAL_ARRIVAL`
- **Expected**: `200 OK`

---

### ✅ 9. Payment Processing (Patient)

Login back as Patient:

- **Folder**: `01. Auth Module` → `01.1 Email & Password Auth` → `Login User (Admin / Driver / Patient)`
- **Body**: `patient@example.com` / `Password123!`
- Sets patient `{{accessToken}}`

#### Step 9.0 — Get Itemized Fare Estimate (Patient Reviews Bill)

- **Folder**: `09. Payment Module` → `09.1 Common / Status` → `Get Fare Estimate (PATIENT / ADMIN)`
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/v1/payments/fare/{{requestId}}`
- **Expected**: `200 OK`, returns dynamic invoice breakdown:
  ```json
  {
    "success": true,
    "message": "Fare calculated successfully",
    "data": {
      "request": {
        "id": "e91b351d-...",
        "priority": "CRITICAL",
        "status": "DISPATCHED"
      },
      "fare": {
        "ambulanceType": "ADVANCED_LIFE_SUPPORT",
        "baseFare": 1200,
        "priority": "CRITICAL",
        "prioritySurcharge": 200,
        "distanceKm": 5.2,
        "ratePerKm": 40,
        "distanceFare": 208,
        "totalFare": 1608
      }
    }
  }
  ```

---

Choose any **one** of the three production-grade payment options below:

---

#### Option A — bKash Tokenized PGW (Full 2-Step Flow)

bKash uses a secure two-step checkout flow (Agreement/Session Creation followed by Execution/Capture).

**Step 9A.1 — Create Checkout URL**:
- **Folder**: `09. Payment Module` → `09.3 bKash PGW (Tokenized)` → `Create bKash Checkout URL (PATIENT)`
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/v1/payments/bkash/create`
- **Body**:
  ```json
  {
    "requestId": "{{requestId}}",
    "amount": 50,
    "payerReference": "01770618575"
  }
  ```
  > 💡 **Note**: `amount` is optional. If omitted, the server charges the exact calculated fare (e.g. 1,608 BDT). For bKash sandbox testing, passing `"amount": 50` avoids sandbox test wallet limits.
- **Expected**: `201 Created`
  - Response contains `bkashURL` and `paymentID`
  - Postman test script **auto-saves** `{{bkashPaymentID}}`
- **Action**: Open the `bkashURL` in your web browser:
  1. Enter Sandbox Wallet Number: `01770618575` (or `01770618576`)
  2. Click **Confirm**
  3. Enter Test OTP: `123456`
  4. Enter Test PIN: `12121`
  5. The bKash screen redirects back to the callback URL.

**Step 9A.2 — Execute & Finalize bKash Payment**:
- **Folder**: `09. Payment Module` → `09.3 bKash PGW (Tokenized)` → `Execute bKash Payment (PATIENT)`
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/v1/payments/bkash/execute`
- **Body**:
  ```json
  {
    "paymentID": "{{bkashPaymentID}}",
    "requestId": "{{requestId}}"
  }
  ```
- **Expected**: `200 OK`
  - `status: "SUCCESS"`
  - `trxID` captured from bKash (e.g., `TR0011xuX...`)
  - **Side effects**:
    - `Payment.status`: `PENDING` → `SUCCESS`
    - `EmergencyRequest.status`: `DISPATCHED` → `COMPLETED`

---

#### Option B — SSLCommerz Hosted Gateway (Hosted Redirection + IPN)

SSLCommerz uses the official v4 Hosted Checkout redirect model.

**Step 9B.1 — Initiate SSLCommerz Session**:
- **Folder**: `09. Payment Module` → `09.4 SSLCommerz Gateway` → `Initiate SSLCommerz Session (PATIENT)`
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/v1/payments/sslcommerz/initiate`
- **Body**:
  ```json
  {
    "requestId": "{{requestId}}"
  }
  ```
  > 💡 `amount` is optional; defaults to the authoritative server-calculated fare.
- **Expected**: `201 Created`
  - Response contains `gatewayUrl` (or `gatewayPageURL`) and `sessionKey`
  - Creates a `PENDING` payment record in the database.

**Step 9B.2 — Complete Payment in Browser**:
- **Action**: Copy `gatewayUrl` from the response and paste it into your browser.
- **In Sandbox Gateway UI**:
  1. Click the **"Cards"** or **"Mobile Banking"** tab.
  2. Click **"Success"** (instant sandbox test approval button) or select any demo card.
  3. SSLCommerz automatically redirects to:
     `http://localhost:5000/api/v1/payments/sslcommerz/success`
- **Expected Result**:
  - The backend receives and validates the transaction with SSLCommerz's Order Validation API.
  - Returns `{ success: true, message: "Payment validated and completed successfully" }`.
  - **Side effects**:
    - `Payment.status`: `PENDING` → `SUCCESS`
    - `EmergencyRequest.status`: `DISPATCHED` → `COMPLETED`

---

#### Option C — Stripe Hosted Checkout (International Cards)

Stripe uses a hosted Checkout session with server-side webhook validation.

**Step 9C.1 — Start Stripe Webhook Listener (Terminal)**:
In a separate terminal window, forward Stripe events to your local server:
```bash
stripe listen --forward-to localhost:5000/api/v1/payments/stripe/webhook
```

**Step 9C.2 — Create Stripe Checkout Session**:
- **Folder**: `09. Payment Module` → `09.2 Stripe Gateway` → `Create Stripe Checkout Session (PATIENT)`
- **Method**: `POST`
- **URL**: `{{baseUrl}}/api/v1/payments/stripe/checkout`
- **Body**:
  ```json
  {
    "requestId": "{{requestId}}"
  }
  ```
- **Expected**: `201 Created`
  - Returns `checkoutUrl` containing `checkout.stripe.com/c/pay/...`
  - Returns `sessionId`

**Step 9C.3 — Pay in Browser**:
- Open the `checkoutUrl` in your browser.
- Enter standard Stripe test card: `4242 4242 4242 4242`
- Enter any future MM/YY (e.g. `12/28`) and CVC `123`.
- Click **Pay**.
- Upon success, the Stripe CLI forwards `checkout.session.completed` to your backend.
- The webhook handler automatically marks `Payment.status: SUCCESS` and `EmergencyRequest.status: COMPLETED`.

---

### ✅ 10. Verify Payment Status

Check the final state of the transaction in the database:

- **Folder**: `09. Payment Module` → `09.1 Common / Status` → `Get Payment Status (PATIENT / ADMIN)`
- **Method**: `GET`
- **URL**: `{{baseUrl}}/api/v1/payments/{{requestId}}`
- **Expected**: `200 OK`
  ```json
  {
    "success": true,
    "data": {
      "requestId": "{{requestId}}",
      "status": "SUCCESS",
      "amount": 1608,
      "gateway": "SSLCOMMERZ",
      "gatewayTxnId": "..."
    }
  }
  ```

---

### ✅ 11. Admin Dashboard Stats

Login as Admin, then:

- **Folder**: `08. Admin Module` → `08.2 System Analytics & Auditing` → `Get Dashboard Statistics (ADMIN)`
- **Expected**: Revenue incremented, completed request count updated

---

## 🚨 Error Scenario Testing

Verify that security guards and business rules are enforced:

| Test                                  | Folder                                                                  | Expected           |
| ------------------------------------- | ----------------------------------------------------------------------- | ------------------ |
| Login with wrong password             | `01.4 Error Scenarios` → `[Error] Login with Wrong Password`            | `401 Unauthorized` |
| Register with duplicate email         | `01.4 Error Scenarios` → `[Error] Register with Duplicate Email`        | `409 Conflict`     |
| Access route without token            | `01.4 Error Scenarios` → `[Error] Access Protected Route Without Token` | `401 Unauthorized` |
| Patient accessing Admin route         | `01.4 Error Scenarios` → `[Error] Patient Accessing Admin Route (RBAC)` | `403 Forbidden`    |
| Pay before dispatch (PENDING request) | `09.1 Common / Status` → `[Error] Pay for PENDING Request`              | `400 Bad Request`  |

---

## 🔁 Re-run Checklist

If you need to re-test from scratch (e.g., after a DB reset):

- [ ] Health check passes
- [ ] Admin login succeeds and `{{accessToken}}` is set
- [ ] Ambulance created — `{{ambulanceId}}` saved
- [ ] Hospital created / verified — `{{hospitalId}}` saved
- [ ] Driver created — `{{driverId}}` saved
- [ ] Patient registered — `{{accessToken}}` set to patient token
- [ ] Emergency request created — `{{requestId}}` saved, `status: PENDING`
- [ ] Dispatch created — `{{dispatchId}}` saved, request `status: DISPATCHED`
- [ ] Driver en route & patient picked up (`PATIENT_PICKUP`)
- [ ] Driver selects hospital (`HOSPITAL_SELECTED`) & arrives (`HOSPITAL_ARRIVAL`)
- [ ] Payment completed — `status: SUCCESS`, request `status: COMPLETED`
- [ ] Admin stats reflect updated revenue
