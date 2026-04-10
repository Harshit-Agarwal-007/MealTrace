# MealTrace Digital — Tier 1 UI Screens, Flows & CTAs

**Scope:** Tier 1 MVP only (per *MealTrace Digital — Internal Development Plan*, April 2026).  
**Audience:** Product, design, Flutter (Android), Web PWA (iOS Safari), QA.  
**Note:** The client proposal (`MealTrace Digital Proposal.docx`) could not be machine-read in this environment; this document aligns with the internal dev plan and the implemented backend contracts.

---

## 1. Tier 1 system snapshot (what the product is)

MealTrace Digital Tier 1 is a **QR-based meal entitlement system** for PG / catering operations:

- **Residents** hold a **signed QR** tied to their PG **site**; balance is stored as **meal credits**; scans deduct credits or consume a **guest pass**.
- **Vendors** run a **scanner** at a chosen **site** and validate QR (or **manual entry** in the API; camera UX on mobile).
- **Super Admin** manages **residents**, **vendors**, **sites & meal windows**, **manual credits**, **reports**, and sees a **live scan feed** (polling in Tier 1 backend).

**Platforms in Tier 1 (dev plan):**

| Platform | Role(s) | Distribution |
|----------|---------|----------------|
| **Flutter — Android** | Resident, Vendor | Google Play (internal or production) |
| **Web PWA (React/HTML)** | Resident, Vendor, Admin | Firebase Hosting / Vercel; **primary path for iPhone** (“Add to Home Screen”) |
| **Testing dashboard** (`/ui`) | All (dev) | Same backend; **not** a production UX |

---

## 2. Roles and permissions (UI implications)

| Role | Primary goals | Must never see (Tier 1) |
|------|----------------|-------------------------|
| **RESIDENT** | Login, show QR offline-capable, balance, history, buy plan / guest pass, notifications | Admin/vendor tools, other residents’ data |
| **VENDOR** | Pick site, scan QR, see green/red result, manual fallback | Admin reports, global resident PII beyond search |
| **SUPER_ADMIN** | CRUD residents/vendors/sites, overrides, reports, dashboard | End-user payment card data (handled by Razorpay UI) |

JWT carries `role`; UIs **branch after login** (resident stack vs vendor stack vs admin stack).

---

## 3. Global UX patterns (all clients)

### 3.1 Authentication

- **Production:** User signs in with **Firebase Auth** (email/password and/or phone OTP per Firebase config) → app obtains **Firebase ID token** → **POST /auth/login** with that token → store **access + refresh** JWTs.
- **Session:** Use **Authorization: Bearer &lt;access_token&gt;** on API calls; on **401**, try **POST /auth/refresh-token** then retry.
- **Logout:** Call **POST /auth/logout** (noop server-side) and **delete tokens locally**; unregister FCM if applicable.

### 3.2 Push notifications (FCM)

- After login, register device token: **POST /auth/fcm-token**.
- Typical notification types (backend): scan success, low balance, payment confirmed, credit override, admin broadcast (where implemented).

### 3.3 Offline / resilience

- **Resident QR:** Cache last **GET /resident/qr-code** image (or payload if you render QR locally) so the queue can still show QR if the network blips (PWA: service worker; Flutter: local cache).
- **Vendor:** Scanning needs camera/network; show cached **last result** only as UX polish.

### 3.4 Error presentation

- Map HTTP **401** → login screen; **403** → “not allowed for your role”; **400** → show `detail` message; **5xx** → generic retry.

---

## 4. Resident experience — screen-by-screen

Below: **screen name**, **purpose**, **entry**, **UI elements**, **CTAs**, **APIs** (detailed wiring is in `MealTrace_Tier1_Frontend_Backend_Wiring.md`).

### 4.1 Splash / bootstrap

- **Purpose:** Brand, load Firebase, check stored tokens, route to login or home.
- **CTAs:** None (auto).
- **Work:** If refresh token valid, refresh access token; optionally prefetch profile.

### 4.2 Login

- **Purpose:** Authenticate resident.
- **Elements:** Email/phone fields per Firebase strategy, OTP/password UI, “Forgot password” if email/password.
- **CTAs:**
  - **Send OTP / Continue** → Firebase Auth flow → **POST /auth/login**.
  - **Forgot password** → **POST /auth/forgot-password** (always soft-success message).
  - **Register** (if product allows self-signup) → **POST /auth/register** (only when tenant allows; often Tier 1 residents are admin-provisioned).

### 4.3 Home / Dashboard (resident)

- **Purpose:** Single place for QR, balance, quick actions.
- **Elements:** QR card, balance chip/bar, shortcuts to history, pay, profile.
- **CTAs:**
  - **Refresh QR** → **GET /resident/qr-code** (regenerates signed payload).
  - **View history** → navigate to transactions.
  - **Top up / Plans** → plans & checkout flow.
- **Data load:** **GET /resident/balance**, **GET /resident/subscription** (for which meals are allowed / plan state).

### 4.4 Meal QR (full-screen optional)

- **Purpose:** Large QR for vendor scan.
- **CTAs:** **Refresh**, **Brightness hint** (OS-level), **Back**.

### 4.5 Transaction history

- **Purpose:** Paginated list of scans (success/blocked as logged).
- **CTAs:** **Load more** (pagination) → **GET /resident/transactions?page=&page_size=**.
- **Columns:** Time, meal type, site, status, block reason (if any).

### 4.6 Profile

- **Purpose:** View/edit safe fields.
- **Display:** **GET /resident/profile**.
- **CTAs:**
  - **Save** (if self-edit enabled) → **PATCH /resident/profile** (name, phone, room, dietary preference per schema).
  - **Change password** → **POST /auth/change-password**.

### 4.7 Plans & payment (Razorpay)

- **Purpose:** Buy **meal pack** (plan) via Razorpay Checkout.
- **Steps:**
  1. **GET /plans** — list catalog (filter client-side by `is_active` if needed).
  2. User selects plan + **which meals** (must match `meals_per_day`) → either:
     - **Payment-first:** **POST /payments/create-order** with `plan_id` → Razorpay → on success webhook credits resident; **then** app must align subscription (see backend gap doc), **or**
     - **Subscribe API path** (admin/resident app rules): **POST /resident/subscribe** with `plan_id` + `selected_meals` (product must define single source of truth to avoid double credits).
  3. **POST /auth/fcm-token** already registered for “payment confirmed” toast.

### 4.8 Guest pass

- **Purpose:** One-off meal outside plan (e.g. extra lunch).
- **Ideal product flow (to align with billing):** **POST /payments/create-order** with `guest_pass: true` → pay → issuance tied to payment success.
- **API also exposes** **POST /guest-pass/purchase** (admin or resident role per middleware) — product must treat this as **non-billing** unless gated; see gap analysis in API doc.

### 4.9 Guest pass list

- **Purpose:** Show active/used passes.
- **CTA:** **GET /resident/guest-passes**.

### 4.10 Notification center (in-app)

- **Purpose:** List recent events (often **local** from FCM + optional server fetch — Tier 1 backend may not expose a message inbox API; confirm with backend roadmap).

### 4.11 Settings

- **Purpose:** Language (future), notification toggles, **logout**.
- **CTA:** **POST /auth/logout**.

---

## 5. Vendor experience — screen-by-screen

### 5.1 Login

- Same auth as resident; role in JWT = **VENDOR** → route to scanner shell.

### 5.2 Site selection

- **Purpose:** Bind all scans to **one site** for the session (cross-site QR is blocked).
- **Data:** **GET /vendor/assigned-sites** (preferred) or **GET /sites** (vendor/admin allowed).
- **CTAs:** **Select site** (persist in session), **Continue**.

### 5.3 Scanner (camera)

- **Purpose:** Decode QR string → obtain `qr_payload` text.
- **CTAs:**
  - **Torch** toggle (hardware).
  - **Submit scan** → **POST /scan/validate** with `{ qr_payload, site_id, vendor_id }` where `vendor_id` = JWT `sub`.

### 5.4 Scan result

- **Purpose:** Immediate feedback.
- **States:**
  - **SUCCESS** — green, show `resident_name`, `meal_type`, `balance_after`, optional **dietary_preference**.
  - **BLOCKED** — red, map `block_reason` to human text (invalid QR, wrong site, outside window, duplicate, zero balance, not in plan, expired plan — see scan model).
- **CTAs:** **Scan next** (after ~1.5s auto-clear per dev plan), **Manual entry**.

### 5.5 Manual entry fallback

- **Purpose:** Resident forgot phone; still enforce same business rules.
- **Optional pre-step:** **GET /vendor/search-user?query=** (min 3 chars) to find `resident_id`.
- **Submit:** **POST /scan/manual** with `{ resident_id, site_id, vendor_id, description? }`.

### 5.6 Session log (optional)

- **Purpose:** Last N scans **this session** (local list); optional server history is Tier 2+ unless vendor API extends.

### 5.7 Profile (minimal)

- **GET /vendor/profile** for name, assignments.

---

## 6. Super Admin experience — screen-by-screen

### 6.1 Login

- JWT role **SUPER_ADMIN** → admin shell.

### 6.2 Dashboard

- **Purpose:** KPIs + live feed.
- **Data:** **GET /admin/dashboard/stats**, **GET /admin/dashboard/scan-feed?limit=**.
- **CTAs:** **Refresh feed** (polling); navigate to resident/site from row (future deep links).

### 6.3 Resident management

- **List:** **GET /admin/residents** with filters (`status`, `site_id`, `search`, pagination).
- **Detail:** **GET /admin/residents/{id}**; **transactions:** **GET /admin/residents/{id}/transactions**.
- **CTAs:**
  - **Add resident** → **POST /admin/residents**.
  - **Bulk import** → **POST /admin/residents/bulk** (CSV).
  - **Edit** → **PATCH /admin/residents/{id}**.
  - **Deactivate** → **DELETE /admin/residents/{id}** (soft delete).
  - **Subscribe resident** → **POST /admin/residents/{id}/subscribe** (same body as resident subscribe).

### 6.4 Vendor management

- **List / detail:** **GET /admin/vendors**, **GET /admin/vendors/{id}**.
- **CTAs:** **POST /admin/vendors**, **PATCH /admin/vendors/{id}**, **DELETE /admin/vendors/{id}**.

### 6.5 Sites & meal windows

- **List:** **GET /sites**; **create/update:** **POST /sites**, **PATCH /sites/{id}**, **DELETE /sites/{id}** (soft deactivate in implementation).

### 6.6 Credit override

- **POST /admin/credit-override** with signed reason; **GET /admin/credit-overrides** for audit.

### 6.7 Reports (Excel)

- **GET /admin/reports/weekly**, **monthly**, **financial**, **exception** — trigger **file download**; **exception** accepts date range query params per API.

### 6.8 Plans (catalog) management

- **GET /admin/plans**, **POST /admin/plans**, **PATCH /admin/plans/{id}**, **DELETE /admin/plans/{id}** (soft).

### 6.9 Search

- **GET /admin/search?q=** unified search.

### 6.10 Site-scoped views

- **GET /admin/sites/{id}/residents**, **GET /admin/sites/{id}/live-scans**.

### 6.11 Broadcast notification

- **POST /admin/notifications/broadcast** (title, message, optional `site_id`).

---

## 7. Android (Flutter) — Tier 1 specifics

- **Navigation:** Resident: bottom nav **Home | History | Profile** (typical); Vendor: **Site → Scan** stack; Admin: tabbed or drawer (if admin ever ships on Android in Tier 1 — dev plan emphasizes vendor + resident on Android).
- **Scanner:** `mobile_scanner` (per dev plan) → pass raw payload string to API.
- **HTTP:** dio + interceptors for auth refresh.
- **Storage:** `flutter_secure_storage` for tokens; Hive for QR cache.
- **Haptics / audio:** success vs block feedback (dev plan).

---

## 8. iPhone — Web PWA specifics

- **Safari:** Install PWA to home screen for full-screen feel.
- **Offline QR:** Service worker should cache last successful **GET /resident/qr-code** response (or cached image).
- **Payments:** Razorpay Checkout in web view / iframe per Razorpay web integration.
- **Camera (vendor PWA):** Safari camera permissions; fallback to manual entry if camera API limitations.

---

## 9. Internal testing UI (`/ui` — static)

**Not production.** Dev-only patterns:

- Login via **GET /dev/users** + **POST /dev/login** (bypasses Firebase).
- Vendor loads **GET /dev/sites** and **GET /dev/users** instead of `/vendor/assigned-sites` and real scanner.
- Scan flow calls **GET /dev/generate-qr/:residentId** then **POST /scan/validate**.

Use this only to exercise APIs locally.

---

## 10. CTA → outcome matrix (quick reference)

| CTA | Resident | Vendor | Admin |
|-----|----------|--------|-------|
| Login | Firebase → JWT | Firebase → JWT | Firebase → JWT |
| Refresh QR | `/resident/qr-code` | — | — |
| Scan | — | `/scan/validate` or `/scan/manual` | — |
| Pay plan | `/payments/create-order` + Razorpay | — | — |
| Override credits | — | — | `/admin/credit-override` |
| Reports | — | — | `/admin/reports/*` |

---

## 11. Tier 1 acceptance checklist (UI)

- [ ] Resident can display QR and balance after login.
- [ ] Vendor can select site and complete a scan with clear success/fail.
- [ ] Admin can add resident, deactivate, override credits, download at least one report.
- [ ] iPhone PWA can add to home screen and reopen; QR still visible offline (cached).
- [ ] Android vendor scan round-trip under ~2s on 4G (dev plan target).

---

*End of Tier 1 UI / screen documentation.*
