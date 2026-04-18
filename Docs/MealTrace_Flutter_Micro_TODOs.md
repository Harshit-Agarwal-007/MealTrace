# MealTrace Digital — Tier 1 Flutter App Micro TODOs

**Goal:** Build the Resident and Vendor mobile apps using Flutter, wiring up the FastAPI backend concurrently.
**Tech Stack:** Flutter, `dio` (HTTP API), `flutter_secure_storage` (JWTs), `hive` (QR offline cache), `firebase_core` & `firebase_auth` (Login), `firebase_messaging` (FCM), `qr_flutter` (display), `mobile_scanner` (vendor camera), Razorpay SDK.

---

## Phase 1: Project Setup & Core Infrastructure
- [ ] **1.1 Initialize Project:** Create Flutter project, set up Android/iOS folders, configure app package name/bundle ID.
- [ ] **1.2 Dependencies:** Add `dio`, `flutter_secure_storage`, `hive`, `provider` (or `riverpod`), `go_router`, `firebase_core`, `firebase_auth`.
- [ ] **1.3 Environment & Config:** Setup `Config` class for Base URL (Local vs Prod) and Razorpay keys.
- [ ] **1.4 Local Storage Service:** Implement wrapper for `flutter_secure_storage` (auth tokens) and `hive` (offline QR payload/image).
- [ ] **1.5 HTTP Client (Dio):** 
  - Create Dio singleton.
  - Add `AuthInterceptor` to inject `Authorization: Bearer <access_token>`.
  - Add `RefreshInterceptor` to catch 401s, call `POST /auth/refresh-token`, and retry the failed request.
- [ ] **1.6 Firebase Init:** Configure Firebase via `flutterfire configure`. Initialize in `main.dart`.

## Phase 2: Authentication Flow
- [ ] **2.1 Splash Screen & Routing:** Check local storage for valid JWT. If valid, decode role and route to `ResidentNav` or `VendorNav`. If invalid, route to `LoginScreen`.
- [ ] **2.2 Login UI:** Build UI for Email/Password (or Phone OTP) according to Firebase Auth strategy.
- [ ] **2.3 Firebase Auth Integration:** Implement Firebase sign-in logic to retrieve `firebase_id_token`.
- [ ] **2.4 Backend Auth Wiring:** Call `POST /auth/login` with `firebase_id_token`. Store resulting `access_token`, `refresh_token`, and `role`.
- [ ] **2.5 Push Notifications (FCM):** 
  - Request notification permissions.
  - Get FCM token and call `POST /auth/fcm-token`.
  - Listen for foreground/background messages (e.g., `SCAN_SUCCESS`).
- [ ] **2.6 Logout Logic:** Clear local storage, call `POST /auth/logout`, route to `LoginScreen`.

## Phase 3: Resident Module
- [ ] **3.1 Resident Shell UI:** Set up Bottom Navigation Bar (Home, History, Profile).
- [ ] **3.2 Dashboard Data Fetch:** Parallel fetch `GET /resident/profile`, `GET /resident/balance`, and `GET /resident/subscription`.
- [ ] **3.3 Dashboard UI:** Build Profile Header, Balance Chip (meals remaining), and Active Plan status.
- [ ] **3.4 QR Code Management:**
  - Check local `hive` cache for offline display.
  - Fetch `GET /resident/qr-code`.
  - Cache new `qr_base64` and display using `Image.memory` or `qr_flutter` (if raw payload).
  - Add manual "Refresh QR" button.
- [ ] **3.5 Transaction History:** 
  - Call `GET /resident/transactions?page=1&page_size=20`.
  - Build paginated `ListView` showing timestamp, meal type, site, and status (Green/Red).
- [ ] **3.6 Profile Screen:** Display read-only fields. Add "Edit" button to call `PATCH /resident/profile` (Name, Phone, Room).
- [ ] **3.7 Settings / Logout:** Add logout button and change password UI (`POST /auth/change-password`).

## Phase 4: Vendor Module
- [ ] **4.1 Vendor Shell UI:** Set up basic app bar, logout button, and active site display.
- [ ] **4.2 Site Selection:** 
  - Fetch `GET /vendor/assigned-sites` (fallback `GET /sites`).
  - Build UI to select and persist active `site_id` for the session.
- [ ] **4.3 Scanner UI:** Integrate `mobile_scanner` for full-screen camera view. Add torch toggle.
- [ ] **4.4 Scan Validation Logic:** 
  - On barcode detect -> pause camera -> call `POST /scan/validate` with `{ qr_payload, site_id, vendor_id }`.
- [ ] **4.5 Scan Result Overlays:**
  - **SUCCESS:** Green screen, show `resident_name`, `meal_type`, `balance_after`. Play success chime.
  - **BLOCKED:** Red screen, show `block_reason` mapped to human-readable text. Play error buzz.
  - Auto-dismiss after 2 seconds to resume scanning.
- [ ] **4.6 Session Log (Local):** Keep an in-memory list of the last N scans for the vendor to review.
- [ ] **4.7 Manual Entry Fallback:**
  - Build search bar -> call `GET /vendor/search-user?query=`.
  - Select user -> call `POST /scan/manual` with `description`.

## Phase 5: Plans & Payments (Resident)
- [ ] **5.1 Plan Catalog UI:** Fetch `GET /plans` and display available meal plans.
- [ ] **5.2 Order Creation:** 
  - User selects plan + meals.
  - Call `POST /payments/create-order` -> get `order_id` and `amount`.
- [ ] **5.3 Razorpay Checkout:** 
  - Initialize Razorpay Flutter SDK.
  - Pass `order_id`, `amount`, `key` to Razorpay UI.
  - Handle success/failure callbacks.
- [ ] **5.4 Post-Payment Alignment:** *(Waiting on backend fix)* Ensure resident profile reflects new plan/credits (either wait for webhook FCM or poll).
- [ ] **5.5 Guest Pass Flow:** UI for purchasing a single-use guest pass (`POST /guest-pass/purchase` or via Razorpay).

## Phase 6: Polish & QA
- [ ] **6.1 Error Handling:** Ensure all API errors show a snackbar/toast mapping HTTP 400s to readable messages.
- [ ] **6.2 Loading States:** Add shimmer effects or loading spinners across all screens.
- [ ] **6.3 Offline Resilience:** Test Resident app with Wifi off (ensure QR loads from Hive).
- [ ] **6.4 Platform specific config:** Setup Android icons, permissions (Camera, Internet, Notifications).
