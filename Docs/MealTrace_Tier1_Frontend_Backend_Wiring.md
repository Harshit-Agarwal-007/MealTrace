# MealTrace Digital — Tier 1 Frontend ↔ Backend Wiring

**Purpose:** Map every Tier 1 screen and client (Flutter Android, Web PWA / iPhone, internal `/ui`) to **concrete HTTP calls**, payloads, and **known integration hazards**.  
**Prerequisites:** Read `MealTrace_Tier1_UI_Screens_and_Flows.md` and `MealTrace_Tier1_Backend_APIs.md`.

---

## 1. Conventions

### 1.1 Base URL

- **Production / staging:** single origin per environment, e.g. `https://api.mealtrace.example`.
- **Local:** `http://localhost:8000` (uvicorn).
- **Static test UI:** served at **`/ui`** (see `app/main.py`); `app.js` uses `window.location.origin` so APIs hit the same host.

### 1.2 Headers

| Header | When |
|--------|------|
| `Authorization: Bearer <access_token>` | All authenticated routes |
| `Content-Type: application/json` | JSON bodies |
| `X-Razorpay-Signature` | Razorpay → **only** server-to-server webhook |

### 1.3 Role routing after login

Decode JWT payload client-side **only for UX** (or call `/resident/profile` etc.); authoritative role is server-side. Typical `role` values: `RESIDENT`, `VENDOR`, `SUPER_ADMIN`.

---

## 2. Authentication wiring

### 2.1 Production login sequence

| Step | Client action | API | Notes |
|------|---------------|-----|-------|
| 1 | Firebase Auth sign-in (email/password or phone OTP per config) | Firebase SDK | No direct MealTrace call yet |
| 2 | `getIdToken()` | — | Firebase ID token string |
| 3 | Exchange for JWT | **POST /auth/login** | Body: `{ "firebase_id_token": "<token>" }` per `LoginRequest` |
| 4 | Persist tokens | — | Secure storage: access + refresh |
| 5 | Register push | **POST /auth/fcm-token** | After FCM token known |

**Refresh path:** **POST /auth/refresh-token** with `{ "refresh_token": "..." }` on 401 from any call.

**Logout:** **POST /auth/logout** + delete local tokens.

### 2.2 Optional registration

| Screen | API |
|--------|-----|
| Sign up | **POST /auth/register** |

### 2.3 Password flows

| Action | API |
|--------|-----|
| Forgot | **POST /auth/forgot-password** |
| Change (logged in) | **POST /auth/change-password** |

### 2.4 Dev testing UI (`/ui`) — **not production**

| Step | API |
|------|-----|
| List selectable users | **GET /dev/users** |
| Login | **POST /dev/login** `{ "user_id": "..." }` or `{ "role": "RESIDENT" }` |

Tokens are real JWTs for the same backend RBAC.

---

## 3. Resident wiring (Flutter + PWA + iPhone)

### 3.1 App shell after login

| Data | API | Use |
|------|-----|-----|
| Profile | **GET /resident/profile** | Name, site, status, dietary |
| Balance | **GET /resident/balance** | Credits + plan expiry |
| Subscription | **GET /resident/subscription** | Allowed meals, plan state |

**Parallel fetch:** profile + balance + subscription on dashboard mount.

### 3.2 QR code card

| Action | API | Response use |
|--------|-----|--------------|
| Load / refresh | **GET /resident/qr-code** | `qr_base64` → `<img src="data:image/png;base64,...">` or render QR from `payload` if client-side |

**Offline:** cache last successful `qr_base64` (and optionally timestamp); show stale indicator.

### 3.3 Transaction history

| Action | API |
|--------|-----|
| First page | **GET /resident/transactions?page=1&page_size=20** |
| Next page | Increment `page` until `transactions.length < page_size` or API returns empty |

Map each row: `timestamp`, `meal_type`, `site_id` / `site_name`, `status`, `block_reason`.

### 3.4 Profile edit

| Action | API |
|--------|-----|
| Save | **PATCH /resident/profile** | Only fields allowed by `UpdateSelfProfileRequest` |

### 3.5 Plans & Razorpay checkout

| Step | API | Body / notes |
|------|-----|--------------|
| Catalog | **GET /plans** | Show `name`, `meals_per_day`, `meal_count`, `duration_days`, `price` |
| Create order | **POST /payments/create-order** | `{ "plan_id": "...", "guest_pass": false }` — optional `amount` override for guest pass only |
| Client checkout | Razorpay Checkout JS / Flutter SDK | Use `order_id`, `amount`, `currency`, `key` from response |
| Webhook | *(server-only)* **POST /payments/webhook** | Client does not call |

**Integration hazard:** Webhook credits balance; **POST /resident/subscribe** also adds credits. Product must define **one** post-payment path — see gap doc. Recommended until backend unifies: **admin-only subscribe** or **payment-only** with backend fix.

### 3.6 Guest pass (product-dependent)

| Path | API | Risk |
|------|-----|------|
| Paid guest pass | **POST /payments/create-order** with `guest_pass: true` | Webhook currently adds **balance +1**, not a guest pass document — **misaligned** |
| Direct issuance | **POST /guest-pass/purchase** | Body: `site_id`, `meal_type`; returns QR — **scan pipeline may not resolve guest QR to resident** |

**Do not ship client guest-pass UX until backend guest pass + scan story is fixed** (see API gap analysis).

### 3.7 Guest pass list

| Action | API |
|--------|-----|
| List | **GET /resident/guest-passes** |

---

## 4. Vendor wiring (Flutter + PWA)

### 4.1 Profile bootstrap

| Data | API |
|------|-----|
| Vendor info | **GET /vendor/profile** |

### 4.2 Site picker

| Preferred | API |
|-------------|-----|
| Assigned sites only | **GET /vendor/assigned-sites** → use `sites[]` |

Fallback for debugging: **GET /sites** (same host, vendor JWT).

**Bind `site_id`** for every scan for the session.

### 4.3 Camera scan → validate

| Step | API |
|------|-----|
| Extract payload string from QR | Local decoder |
| Validate | **POST /scan/validate** |

**Body:**

```json
{
  "qr_payload": "<exact string from QR>",
  "site_id": "<selected site>",
  "vendor_id": "<JWT sub — must match logged-in vendor>"
}
```

**UI mapping:**

- `status === "SUCCESS"` → green; show `resident_name`, `meal_type`, `balance_after`, `dietary_preference`.
- `status === "BLOCKED"` → red; map `block_reason` to localized string (include `NOT_IN_PLAN`, `EXPIRED_PLAN`).

**Auto-advance:** dev plan suggests reset after ~1.5s → resume camera.

### 4.4 Manual entry

| Step | API |
|------|-----|
| Search | **GET /vendor/search-user?query=** (≥ 3 chars) |
| Commit | **POST /scan/manual** |

**Body:**

```json
{
  "resident_id": "<from search result>",
  "site_id": "<selected>",
  "vendor_id": "<JWT sub>",
  "description": "Forgot phone"
}
```

---

## 5. Super Admin wiring (PWA primary; Flutter optional)

### 5.1 Dashboard

| Widget | API |
|--------|-----|
| KPI cards | **GET /admin/dashboard/stats** |
| Live table | **GET /admin/dashboard/scan-feed?limit=50** |

**Refresh:** poll every 10–30s or manual refresh button (no WebSocket in Tier 1 backend).

### 5.2 Residents

| Action | API |
|--------|-----|
| List | **GET /admin/residents?page=&page_size=&status=&site_id=&search=** |
| Detail | **GET /admin/residents/{id}** |
| Create | **POST /admin/residents** |
| Bulk CSV | **POST /admin/residents/bulk** `multipart/form-data` file field |
| Update | **PATCH /admin/residents/{id}** |
| Deactivate | **DELETE /admin/residents/{id}** |
| Resident’s txs | **GET /admin/residents/{id}/transactions** |
| Subscribe for resident | **POST /admin/residents/{id}/subscribe** |

### 5.3 Vendors

| Action | API |
|--------|-----|
| List | **GET /admin/vendors?page=&page_size=&search=&site_id=** |
| Detail | **GET /admin/vendors/{id}** |
| Create | **POST /admin/vendors** |
| Update | **PATCH /admin/vendors/{id}** |
| Deactivate | **DELETE /admin/vendors/{id}** |

### 5.4 Sites

| Action | API |
|--------|-----|
| List | **GET /sites** |
| Detail | **GET /sites/{id}** |
| Create | **POST /sites** |
| Update | **PATCH /sites/{id}** |
| Deactivate | **DELETE /sites/{id}** |

### 5.5 Credit override

| Action | API |
|--------|-----|
| Apply | **POST /admin/credit-override** |
| Audit list | **GET /admin/credit-overrides?resident_id=&page=&page_size=** |

### 5.6 Reports

| Report | API | Client handling |
|--------|-----|-----------------|
| Weekly | **GET /admin/reports/weekly?start_date=** | Binary Excel — `blob` download |
| Monthly | **GET /admin/reports/monthly?year=&month=** | Same |
| Financial | **GET /admin/reports/financial** | Same |
| Exception | **GET /admin/reports/exception?start_date=&end_date=** | Same |

Use `fetch` + `blob` + object URL; send `Authorization` header.

### 5.7 Plans admin

| Action | API |
|--------|-----|
| List (incl. inactive) | **GET /admin/plans** |
| Create | **POST /admin/plans** |
| Update | **PATCH /admin/plans/{plan_id}** |
| Deactivate | **DELETE /admin/plans/{plan_id}** |

Public catalog for residents: **GET /plans**.

### 5.8 Search & drill-down

| Action | API |
|--------|-----|
| Unified search | **GET /admin/search?q=** |
| Site residents | **GET /admin/sites/{site_id}/residents** |
| Site live scans | **GET /admin/sites/{site_id}/live-scans?hours=3** |

### 5.9 Broadcast

| Action | API |
|--------|-----|
| Send push | **POST /admin/notifications/broadcast** `{ "title", "message", "site_id": null | "..." }` |

---

## 6. Platform-specific wiring notes

### 6.1 Flutter (Android)

| Concern | Wiring |
|---------|--------|
| HTTP client | dio; interceptors inject Bearer token; on 401 refresh |
| Tokens | `flutter_secure_storage` |
| QR cache | Hive / local file for last `qr_base64` |
| FCM | Firebase Messaging → **POST /auth/fcm-token** on token refresh |
| Razorpay | Native SDK; order from **POST /payments/create-order** |

### 6.2 Web PWA (iPhone Safari + desktop)

| Concern | Wiring |
|---------|--------|
| Service worker | Cache static assets + last QR response for offline |
| Razorpay | Checkout.js |
| Camera | `getUserMedia` for vendor PWA — permission UX; fallback **POST /scan/manual** |
| Add to Home Screen | manifest + icons (deployment config) |

### 6.3 Internal `/ui` test dashboard

| Area | Instead of production API |
|------|---------------------------|
| Login | **GET /dev/users**, **POST /dev/login** |
| Vendor sites | **GET /dev/sites** |
| Vendor residents dropdown | **GET /dev/users** filtered to RESIDENT |
| Scan | **GET /dev/generate-qr/{residentId}** then **POST /scan/validate** |
| Admin sites tab | **GET /dev/sites** (not **GET /sites**) |
| Credit override resident list | **GET /dev/users** |

**Implication:** QA must run **smoke tests** against **production-style** paths before release.

---

## 7. End-to-end flows (sequence summaries)

### 7.1 Happy path: resident meal

1. Resident **GET /resident/qr-code** at breakfast.
2. Vendor selects correct **site_id**, scans QR.
3. **POST /scan/validate** returns SUCCESS, `balance_after` decremented.
4. FCM to resident (`SCAN_SUCCESS` — server-side).

### 7.2 Blocked: duplicate

1. Second scan same meal window same day → `DUPLICATE_SCAN`.

### 7.3 Admin corrects balance

1. **POST /admin/credit-override** with reason.
2. Resident balance updates; optional FCM `CREDIT_OVERRIDE`.

---

## 8. Wiring checklist before release

- [ ] No production client calls `/dev/*`.
- [ ] `vendor_id` in scan body always matches authenticated vendor’s `sub`.
- [ ] Razorpay live vs test keys switched per environment only.
- [ ] Guest pass product decision aligned with backend (issuance + scan).
- [ ] Plan purchase: single clear flow (webhook-only vs subscribe-only) documented for support.

---

## 9. File reference (this repo)

| Client | Location |
|--------|----------|
| Static test UI | `static/index.html`, `static/app.js`, `static/style.css` |
| Routes | `app/routes/*.py` |
| Services | `app/services/*.py` |

---

*End of Tier 1 wiring documentation.*
