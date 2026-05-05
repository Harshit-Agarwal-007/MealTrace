# Client trust boundary and security review (MealTrace)

This document answers whether a **browser script** (or tampered client) can **override credits**, **change meal plans**, or otherwise corrupt server-side financial and entitlement state. It maps **trust boundaries** to concrete code paths and lists **residual risks** and **hardening** suggestions.

## Executive summary

- **Credits and plan entitlements** are authoritative in **Firestore**, updated only through **server-side** routes and transactions (scan deduction, payment webhook, admin tools). The resident SPA **cannot** PATCH `balance`, `plan_id`, or `allowed_meals` on itself.
- **`POST /resident/subscribe` is disabled** (returns 403); residents cannot self-assign a plan via API without going through the **payment** flow (see [`app/routes/resident.py`](../app/routes/resident.py)).
- **Razorpay webhook** is unauthenticated by JWT by design but protected by **signature verification** via `X-Razorpay-Signature` ([`app/routes/payment.py`](../app/routes/payment.py), [`process_webhook`](../app/services/payment_service.py)).
- **Real risks** are mostly **token theft (XSS)**, **compromised admin/vendor JWT**, **misconfiguration** (`APP_ENV`, `JWT_SECRET_KEY`), and **non-production dev routes** left exposed—not “changing a number in DevTools” to alter someone else’s balance.

---

## Threat model (what the attacker controls)

| Asset | Attacker goal | Mechanism often assumed |
|-------|----------------|-------------------------|
| Resident credits | Increase balance without paying | Forge API body / tamper React state |
| Meal plan | Assign premium plan free | Call subscribe or PATCH profile with `plan_id` |
| Scan success | Deduct someone else’s meal | Replay or forge `POST /scan/validate` |
| Payments | Mark paid without Razorpay | Fake webhook or skip checkout |

The backend must enforce that **only validated identity + role + server rules** mutate authoritative fields.

---

## Identity and authorization

- **JWT** (`Authorization: Bearer`) is issued after login ([`app/middleware/auth.py`](../app/middleware/auth.py)). Payload includes `sub` (user id) and `role`. **Clients cannot mint a valid JWT** without `JWT_SECRET_KEY` (and correct algorithm).
- **Role gates**: `require_resident`, `require_admin`, `require_vendor_or_admin`, etc. restrict routes. A script with a **resident** token cannot call **`PATCH /admin/residents/{id}`** or **`POST /admin/credit-override`** without a **403** (unless JWT is forged—secret compromise).

**Residual risk:** XSS on your origin that reads `localStorage` and exfiltrates tokens allows the attacker to **script the same APIs the user can** until refresh/expiry. That is session hijacking, not “override credits via DOM.”

---

## Credits: what clients cannot do

| Action | Server enforcement |
|--------|-------------------|
| Resident sets `balance` in PATCH | **Not allowed.** [`update_self_profile`](../app/services/resident_service.py) only permits a **whitelist** of fields (name, phone, room, dietary, push toggle)—not balance or plan. |
| Resident adds credits | No public “add credits” route. Credits increase via **webhook**, **admin credit override**, or **plan assignment** (admin subscribe / `subscribe_to_plan` after payment path). |
| Resident fakes payment success | **`POST /payments/webhook`** requires valid **`X-Razorpay-Signature`**; invalid body/signature → 400. |
| Client sends arbitrary `amount` on create-order | **Guest pass:** [`create_payment_order`](../app/services/payment_service.py) compares client `amount_override` to catalog-derived price and **rejects mismatch**. Plan path uses **plan document price**, not client-chosen totals for the Razorpay order amount. |

**Scan deduction:** [`POST /scan/validate`](../app/routes/scan.py) uses **`current_user["sub"]`** as vendor and reads/updates resident balance inside **Firestore transactions** in [`validate_scan`](../app/services/scan_service.py). The **QR payload does not carry a trusted balance**; signature binds `resident_id` + `site_id` only (see [`generate_qr_payload`](../app/utils/qr_gen.py) usage in [`get_qr_code`](../app/services/resident_service.py)).

---

## Meal plans: what clients cannot do

| Action | Server enforcement |
|--------|-------------------|
| `POST /resident/subscribe` | **Hard-disabled** with 403 and message to use checkout ([`resident_subscribe`](../app/routes/resident.py)). |
| `PATCH /resident/profile` with `plan_id` | Ignored / not in allowed schema for self-update. |
| Purchase plan without paying | Fulfillment is tied to **verified payment** / admin paths, not arbitrary client assertion of “paid”. |

**Admin** `POST /admin/residents/{id}/subscribe` can assign plans—requires **admin JWT**. That is an **operational privilege**, not a resident browser script.

**Guest pass:** [`POST /guest-pass/purchase`](../app/routes/payment.py) requires Razorpay proof fields; **`skip_checkout_verification`** is only for **`SUPER_ADMIN`** inside [`purchase_guest_pass`](../app/services/payment_service.py)—a compromised admin token could create passes without payment (by design for support); monitor and audit.

---

## Scanning and manual entry

- **`POST /scan/validate`** and **`POST /scan/manual`**: require **vendor or admin** JWT. Vendor **cannot** set another vendor’s `sub`; server uses token identity as `actor_id`.
- **Replay:** A second successful scan same meal same day hits **DUPLICATE_SCAN** (server-side dedupe), not client-side toggles.

**Residual risk:** Stolen **vendor** token allows scans as that vendor within assigned sites—same class as token theft.

---

## Development-only attack surface (critical for “local”)

When **`APP_ENV != production`**, [`dev` router](../app/routes/dev.py) is mounted from [`app/main.py`](../app/main.py):

- **`POST /dev/login`** — Issues real JWTs **without Firebase** if env is non-production.
- **`GET /dev/generate-qr/{resident_id}`** — **No auth**; returns **`qr_payload`** for any resident id. Anyone who can reach the API can mint a scannable payload for testing.

**Requirement:** In any shared or staging host, set **`APP_ENV=production`** (or remove dev router entirely in builds) so these endpoints **404/403**. Never expose dev routes on the public Internet.

---

## Firestore direct access

If the mobile/web client used the **Firebase client SDK** with rules that allow residents to write their own `balance`, that would bypass the API. **This codebase’s FastAPI paths** assume the backend uses **service account** access to Firestore. **Verify** you are not granting broad write rules to `residents/*` in Firebase Console for end-user clients.

---

## Checklist (release / pentest)

1. [ ] **`APP_ENV=production`** on public APIs; confirm **`/dev/*`** not registered.
2. [ ] **`JWT_SECRET_KEY`** strong and rotated on compromise; short access token TTL where acceptable.
3. [ ] **HTTPS** everywhere; **HttpOnly** cookies if you move tokens off `localStorage` (reduces XSS impact).
4. [ ] **CORS** restricted to known frontends (if not already).
5. [ ] **Firestore rules** reviewed: residents cannot write `balance`, `plan_id`, `allowed_meals` directly.
6. [ ] **`RAZORPAY_WEBHOOK_SECRET`** set; webhook URL only in Razorpay dashboard for real env.
7. [ ] **Admin** accounts MFA / IP allowlist (organizational), audit logs for `credit-override` and `subscribe`.

---

## Conclusion

Under normal configuration, **a browser script cannot override another user’s credits or meal plan** by sending crafted JSON to documented resident endpoints: the server **rejects or ignores** those fields, and privileged operations require **appropriate JWT roles**. The main classes of issues to watch are **token theft**, **admin abuse**, **webhook secret leakage**, **dev routes exposed**, and **Firestore rules**—not client-side React state manipulation.
