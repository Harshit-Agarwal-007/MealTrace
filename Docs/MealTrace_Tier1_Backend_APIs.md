# MealTrace Digital — Tier 1 Backend API Reference & Gap Analysis

**Codebase:** FastAPI app in `app/`, Firestore via `app/database.py`.  
**Scope:** Tier 1 MVP only.  
**Companion docs:** `MealTrace_Tier1_UI_Screens_and_Flows.md`, `MealTrace_Tier1_Frontend_Backend_Wiring.md`.

---

## Part A — Tier 1 system understanding (backend lens)

### A.1 Core domain

| Concept | Firestore / behavior |
|--------|----------------------|
| **Resident** | Document in `residents`; has `site_id`, `balance`, `status`, `allowed_meals`, `plan_id`, `plan_expiry`, optional `dietary_preference`. |
| **Vendor / Admin** | Documents in `admin_users` with `role` ∈ `VENDOR`, `SUPER_ADMIN`. |
| **Site** | `sites` with `meal_windows` (time ranges per meal). |
| **Scan** | `scan_logs` entries SUCCESS/BLOCKED; success deducts **1 credit** in a transaction (or consumes **guest pass**). |
| **Plan** | `plans` catalog; subscription logic ties `meals_per_day` to selected meals. |
| **Payments** | Razorpay `payments` pending → webhook verifies signature → credits. |

### A.2 Auth model

1. Client authenticates with **Firebase Auth** and obtains **Firebase ID token**.
2. **POST /auth/login** verifies token server-side and issues **JWT access + refresh** with `sub` = Firestore document id, `role` from `admin_users` / `residents`.
3. All protected routes expect **Authorization: Bearer &lt;JWT access&gt;** (not the Firebase token).

### A.3 Scan engine (hard blocks)

The implementation (`app/services/scan_service.py`) enforces **seven** block reasons (dev plan text mentions “six”; the extra split is **NOT_IN_PLAN** vs **EXPIRED_PLAN** vs **ZERO_BALANCE**):

| Order | Block reason | Meaning |
|-------|--------------|---------|
| 1 | `INVALID_QR` | Bad signature, malformed payload, or resident doc missing |
| 2 | `INACTIVE_RESIDENT` | Resident `status` ≠ `ACTIVE` |
| 3 | `WRONG_SITE` | QR `site_id` ≠ vendor’s `site_id` or site missing |
| 4 | `OUTSIDE_MEAL_WINDOW` | IST time not in configured window |
| — | *(guest pass)* | If unused guest pass matches site/meal (bypasses plan/balance/duplicate) |
| 5 | `NOT_IN_PLAN` | Current meal not in `allowed_meals` |
| 6 | `DUPLICATE_SCAN` | Already SUCCESS for same `meal_type` today (IST day) |
| 7 | `EXPIRED_PLAN` | `plan_expiry` &lt; now |
| 8 | `ZERO_BALANCE` | `balance` ≤ 0 |

**Note:** Duplicate detection query filters `resident_id`, `meal_type`, `status`, `timestamp` but **does not include `site_id`** — edge case if one resident could theoretically scan at multiple sites same meal name.

---

## Part B — Endpoint catalogue (Tier 1)

**Base URL:** deployment-specific (e.g. `https://api.example.com`). **OpenAPI:** `/docs`, `/redoc`.

### B.1 Health — no auth

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Service metadata |
| GET | `/health` | Health + Firestore ping |

---

### B.2 Authentication — `POST /auth/*`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/register` | No | Self-register resident (Firebase user + Firestore + JWT) |
| POST | `/auth/login` | No | Body: Firebase ID token → JWT pair |
| POST | `/auth/refresh-token` | No | Body: refresh token → new pair |
| POST | `/auth/logout` | JWT | Stateless logout |
| POST | `/auth/forgot-password` | No | Triggers Firebase reset email |
| POST | `/auth/fcm-token` | JWT | Store FCM device token for user |
| POST | `/auth/change-password` | JWT | Current + new password |

**Contract vs dev plan:** Dev plan lists “POST /auth/login (email+OTP)”. **Actual:** login expects **Firebase ID token** in body (`LoginRequest`), not raw OTP. Clients must use Firebase SDK first.

---

### B.3 Resident — `/resident/*` (role: `RESIDENT`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/resident/profile` | Full profile |
| PATCH | `/resident/profile` | Self-edit: name, phone, room, dietary preference |
| GET | `/resident/qr-code` | Signed QR PNG (base64) + stores payload on resident |
| GET | `/resident/balance` | Credits + plan id/expiry |
| GET | `/resident/transactions` | Paginated scan history (`page`, `page_size`) |
| GET | `/resident/subscription` | Plan + allowed meals + status |
| POST | `/resident/subscribe` | Subscribe: `plan_id`, `selected_meals` — **also adds `meal_count` credits** |
| GET | `/resident/guest-passes` | List guest passes |

---

### B.4 Scan — `/scan/*` (role: `VENDOR` or `SUPER_ADMIN`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/scan/validate` | Body: `qr_payload`, `site_id`, `vendor_id` |
| POST | `/scan/manual` | Body: `resident_id`, `site_id`, `vendor_id`, `description?` |

---

### B.5 Payments & plans — mixed auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/payments/create-order` | Resident | Razorpay order for `plan_id` and/or `guest_pass` flag |
| POST | `/payments/webhook` | None (signature) | Razorpay webhook — **must** validate `X-Razorpay-Signature` |
| GET | `/plans` | No | Public list of plans from Firestore |
| GET | `/plans/active` | No | Alias of `/plans` (hidden in OpenAPI but active) |
| POST | `/guest-pass/purchase` | Resident **or** Admin | Issues guest pass in DB + QR |

---

### B.6 Sites — `/sites/*`

| Method | Path | Auth |
|--------|------|------|
| GET | `/sites` | Vendor or Admin |
| GET | `/sites/{site_id}` | Vendor or Admin |
| POST | `/sites` | Admin |
| PATCH | `/sites/{site_id}` | Admin |
| DELETE | `/sites/{site_id}` | Admin (soft deactivate) |

---

### B.7 Vendor — `/vendor/*`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/vendor/profile` | Vendor profile |
| GET | `/vendor/assigned-sites` | Sites assigned to vendor |
| GET | `/vendor/search-user` | Query param `query` (min length 3) — search residents |

---

### B.8 Admin — `/admin/*` (role: `SUPER_ADMIN`)

**Residents:** `GET/POST/PATCH/DELETE /admin/residents`, `POST /admin/residents/bulk` (CSV), `GET /admin/residents/{id}`, `GET /admin/residents/{id}/transactions`, `POST /admin/residents/{id}/subscribe`.

**Vendors:** `GET/POST/PATCH/DELETE /admin/vendors`, `GET /admin/vendors/{id}`.

**Sites:** `GET /admin/sites/{id}/residents`, `GET /admin/sites/{id}/live-scans`.

**Search:** `GET /admin/search?q=`.

**Credits:** `POST /admin/credit-override`, `GET /admin/credit-overrides`.

**Reports (Excel):** `GET /admin/reports/weekly`, `monthly`, `financial`, `exception` (query params per route).

**Dashboard:** `GET /admin/dashboard/stats`, `GET /admin/dashboard/scan-feed`.

**Plans (admin):** `GET/POST/PATCH/DELETE /admin/plans`.

**Broadcast:** `POST /admin/notifications/broadcast`.

---

### B.9 Development only — `/dev/*` (disabled when `APP_ENV=production`)

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/dev/login` | Issue JWT without Firebase |
| GET | `/dev/users` | List users for testing |
| GET | `/dev/generate-qr/{resident_id}` | Regenerate QR for resident |
| GET | `/dev/sites` | List sites |

---

## Part C — Response shapes (high-signal fields)

### C.1 `POST /scan/validate` → `ScanValidateResponse`

- `status`: `SUCCESS` | `BLOCKED`
- `resident_name`, `resident_id`, `dietary_preference`, `meal_type`, `balance_after`, `block_reason`, `is_guest_pass`, `timestamp`

### C.2 `TokenResponse`

- `access_token`, `refresh_token`, `token_type`, `expires_in`, `role`, `user_id`

### C.3 `CreateOrderRequest`

- `plan_id?`, `selected_meals?`, `guest_pass`, `amount?`

---

## Part D — Gap analysis (Tier 1): missing, wrong, or must change

### D.1 **Critical — guest pass vs QR scan**

- **`POST /guest-pass/purchase`** creates a guest pass document with a synthetic id `guest_<uuid>` and uses `generate_qr_payload(guest_id, site_id)`.
- **`POST /scan/validate`** verifies QR then loads **`residents`** by `resident_id` from QR. A guest pass id is **not** a resident document → scan **fails** as invalid/unknown resident.

**Required fix direction (choose one):**

1. Store guest pass QR in a way that resolves to **resident_id** before resident lookup, or  
2. Encode guest passes as **resident-bound** payloads only (no fake `rid`), or  
3. Add a dedicated **`/scan/validate-guest-pass`** path that reads `guest_passes` collection first.

---

### D.2 **Critical — payment webhook vs guest pass**

- For `guest_pass` payment type, webhook **adds +1 to `balance`** (`payment_service.process_webhook`) instead of creating a **`guest_passes`** record with expiry.
- That **does not** match “single-use guest QR” product semantics (credits are fungible; guest pass is a separate instrument).

**Required fix:** On `guest_pass` payment success, **create** `guest_passes` doc (or call shared issuance logic) and **do not** treat as generic credit unless product explicitly wants “₹100 = 1 credit”.

---

### D.3 **Critical — double credit / double subscription**

- **`subscribe_to_plan`** adds `plan.meal_count` to `balance` and sets plan fields.
- **`process_webhook`** for plan purchase **also** adds `meal_count` credits.

If a user **pays** and then **subscribes** (or if webhook + subscribe are both triggered), **credits can double** and plan fields may be inconsistent.

**Required fix:** Single source of truth — e.g.:

- **Payment only:** webhook applies credits **and** sets `plan_id` / `allowed_meals` from order metadata (requires `selected_meals` in Razorpay notes + trusted validation), **or**
- **Subscribe only:** subscribe does not add credits when payment is involved; webhook only marks payment complete.

---

### D.4 **High — `CreateOrderRequest.selected_meals` ignored**

- Model includes `selected_meals` but `create_payment_order` does not persist them for webhook to apply allowed meals.

---

### D.5 **Medium — contract vs implementation**

| Dev plan | Actual |
|----------|--------|
| `GET /resident/transactions` | Same |
| `GET /resident/qr-code` | Same (plan also said `qr` — implementation uses `qr-code`) |
| `GET /plans/active` | Implemented as alias of `/plans` |
| “6 hard blocks” | **7** enumerated reasons in code (+ guest pass bypass) |
| Admin live feed “WebSocket or polling” | **Polling only** (no WebSocket) |

---

### D.6 **Medium — bulk import**

- Plan mentions CSV/Excel; route accepts **CSV only** (`admin/residents/bulk`).

---

### D.7 **Low — testing UI vs production**

- Static `/ui` uses **`/dev/*`** for login and vendor site lists — **not** representative of production integration.

---

### D.8 **Security note for Tier 1**

- `POST /guest-pass/purchase` issues a pass **without payment** when called with a valid Resident/Admin JWT — must be **feature-flagged** or removed from public clients if not intended.

---

## Part E — API need summary (why each exists)

| Area | Need |
|------|------|
| Auth | Bridge Firebase identity to backend JWT + RBAC |
| Resident | Profile, QR, balance, history, subscription, self-service |
| Scan | Atomic entitlement check + audit log |
| Payments | Razorpay order + webhook for money movement |
| Plans | Price catalog |
| Sites | Time windows for meal type inference |
| Vendor | Site picker + manual search |
| Admin | Operations, compliance, reports, broadcast |

---

## Part F — Suggested Postman / QA ordering

1. Health → dev login (staging only) or real `/auth/login`.
2. Resident: profile → balance → qr-code → transactions.
3. Vendor: assigned-sites → validate (with valid payload).
4. Payment: create-order (test mode) → webhook simulator.
5. Admin: stats → report download → credit override.

---

*This document reflects the repository state at documentation time; re-run OpenAPI `/docs` after changes.*
