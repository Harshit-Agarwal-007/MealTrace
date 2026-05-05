# Local manual QA: QR scanning (no Razorpay)

Manual test charter for validating vendor **QR** and **manual** scan outcomes on a **local** machine without Razorpay checkout. Razorpay-dependent flows (plan purchase UI, guest pass checkout) are out of scope unless you manually seed Firestore for guest pass consumption.

## Scope

- **In scope:** Vendor [`/vendor/scan`](../frontend/src/app/vendor/scan/page.tsx) → `POST /scan/validate`, vendor [`/vendor/manual`](../frontend/src/app/vendor/manual/page.tsx), resident QR on [`/resident`](../frontend/src/app/resident/page.tsx), admin feed / `scan_logs`.
- **Out of scope:** Razorpay plan purchase and paid guest pass **creation** via UI.

## Preconditions

1. API + web app running; [`NEXT_PUBLIC_API_URL`](../frontend/src/lib/apiClient.ts) points at the API.
2. `.env`: Firebase, `JWT_SECRET_KEY`, stable `QR_SIGNING_SECRET` for the session.
3. Vendor: after login, open **`/vendor`** and select a site so **`vendorSiteId`** is stored in `localStorage` (required by scan page; see [`scan/page.tsx`](../frontend/src/app/vendor/scan/page.tsx)).

## Engine reference

Block reasons: [`app/models/scan.py`](../app/models/scan.py). Order and logic: [`app/services/scan_service.py`](../app/services/scan_service.py). **Meal windows use IST.**

## Admin fixtures (minimal)

| Fixture | Purpose |
|---------|---------|
| Site A — windows covering **current IST** | Start with wide windows (e.g. `00:00`–`23:59`) then narrow for failures |
| Site B (optional) | `WRONG_SITE` when vendor site ≠ resident QR site |
| Vendor assigned to A | Valid scans at A |
| Resident on A, ACTIVE, balance configurable | Success vs `ZERO_BALANCE` |
| `allowed_meals` vs resolved meal | `NOT_IN_PLAN` |
| `plan_expiry` past | `EXPIRED_PLAN` when branch applies |

Refresh resident QR from **`/resident`** after changing `site_id`, status, or signing secret.

## Two-browser workflow

1. **Resident browser:** Login → `/resident` → show QR.  
2. **Vendor browser:** Login → `/vendor` → pick site → `/vendor/scan` → scan.

## Scenario checklist

| ID | Expected | How to reproduce |
|----|----------|------------------|
| S1 | `SUCCESS` | Matching site, active resident, balance ≥ 1, in window, meal in `allowed_meals`, first success that **IST day** for that meal type |
| S2 | `DUPLICATE_SCAN` | Repeat S1 same meal same day |
| S3 | `OUTSIDE_MEAL_WINDOW` | Narrow site meal windows |
| S4 | `NOT_IN_PLAN` | Window meal not in `allowed_meals` |
| S5 | `WRONG_SITE` | Vendor site B, resident on A (or vendor not assigned) |
| S6 | `ZERO_BALANCE` | Balance 0, no valid guest pass |
| S7 | `INACTIVE_RESIDENT` | Deactivate resident (admin), scan |
| S8 | `INVALID_QR` | Garbage payload or QR from before `QR_SIGNING_SECRET` change |
| S9 | `EXPIRED_PLAN` | Set `plan_expiry` past per service logic |
| S10 | Manual parity | `/vendor/manual` — same rules where applicable |

## Verification

- Vendor UI labels ([`BLOCK_LABELS`](../frontend/src/app/vendor/scan/page.tsx)).  
- Admin live feed and/or Firestore `scan_logs` (`status`, `block_reason`, `meal_type`).

## Pitfalls

- **IST vs UTC** when reasoning about “which meal is active.”  
- **Empty `vendorSiteId`** → scan flow broken.  
- **Camera / HTTPS** on localhost (browser-specific).  
- **Dev routes:** With `APP_ENV != production`, [`/dev/generate-qr/{id}`](../app/routes/dev.py) is unauthenticated—only for trusted local use.

## Exit criteria

Each intended `BlockReason` reproduced at least once (or documented skip). No unexplained 5xx on `POST /scan/validate` during the pass.
