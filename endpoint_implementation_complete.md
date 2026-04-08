# MealTrace — Endpoint Implementation Complete

## ✅ 40 Endpoints Live

All missing endpoints identified in the gap analysis have been implemented and verified.

### New Endpoints Added (14)

#### Authentication (2 new)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/register` | Self-registration (email/password → Firebase Auth + Firestore + JWT) |
| `POST` | `/auth/forgot-password` | Firebase password reset email |

#### Resident Subscription (2 new)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/resident/subscription` | Current plan, allowed meals, balance, status |
| `POST` | `/resident/subscribe` | Buy plan + select meals (e.g., `["BREAKFAST","DINNER"]`) |

#### Vendor CRUD (5 new)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/admin/vendors` | Create vendor (Firebase Auth + admin_users) |
| `GET` | `/admin/vendors` | List/search vendors (`?search=&site_id=`) |
| `GET` | `/admin/vendors/{id}` | Single vendor detail |
| `PATCH` | `/admin/vendors/{id}` | Update vendor profile |
| `DELETE` | `/admin/vendors/{id}` | Deactivate vendor |

#### Admin Site & Search (4 new)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/admin/residents/{id}` | Single resident detail (click-through) |
| `GET` | `/admin/sites/{id}/residents` | All residents at a site |
| `GET` | `/admin/sites/{id}/live-scans` | Recent scans at a site (who's eating) |
| `GET` | `/admin/search` | Unified search across residents, vendors, sites |

#### Plans (1 new route)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/plans` | Plans now include `meals_per_day`, `duration_days` |

---

## Model Changes

### `residents` collection — new fields
- `allowed_meals: ["BREAKFAST", "DINNER"]` — meal types the user is subscribed to
- `plan_id`, `plan_name`, `plan_started_at`, `plan_expiry` — subscription tracking
- `firebase_uid` — links to Firebase Auth account

### `plans` collection — new fields
- `meals_per_day: int` — 1, 2, or 3
- `duration_days: int` — validity (default 30)
- `description: str` — human-readable description

### `scan_logs` — new fields
- `is_guest_pass: bool` — whether this scan used a guest pass
- `guest_pass_id: str` — which pass was consumed

### `admin_users` (for vendors) — new fields
- `assigned_site_ids: list` — sites assigned to vendor
- `firebase_uid` — links to Firebase Auth account

---

## Scan Logic — 7 Block Conditions

The scan engine now has **7 hard-block conditions** (was 6):

1. `INVALID_QR` — QR signature failed
2. `INACTIVE_RESIDENT` — resident disabled
3. `WRONG_SITE` — QR site ≠ vendor site
4. `OUTSIDE_MEAL_WINDOW` — not during a meal time
5. **`NOT_IN_PLAN`** ← NEW — meal type not in `allowed_meals`
6. `DUPLICATE_SCAN` — already scanned for this meal today
7. `ZERO_BALANCE` — no credits left

### Guest Pass Bypass
If a resident has an active guest pass, blocks 5/6/7 are **bypassed**. The pass is consumed and the scan succeeds without deducting regular credits.

---

## Flexible Plan Flow

```
User browses plans → GET /plans
  → "1 Meal/Day" (₹1500), "2 Meals/Day" (₹2800), "3 Meals/Day" (₹4000)

User selects plan + meals → POST /resident/subscribe
  → plan_id: "plan_1meal", selected_meals: ["BREAKFAST"]
  → ✅ Resident gets 30 credits, allowed_meals = ["BREAKFAST"]

Next morning → Vendor scans QR → POST /scan/validate
  → 08:00 AM, meal=BREAKFAST, allowed=["BREAKFAST"] → ✅ SUCCESS

That evening → Vendor scans QR → POST /scan/validate
  → 08:00 PM, meal=DINNER, allowed=["BREAKFAST"] → ❌ NOT_IN_PLAN

Resident wants dinner anyway → POST /guest-pass/purchase (₹100)
  → Gets single-use QR → Vendor scans → ✅ SUCCESS (guest pass consumed)
```

---

## Files Changed

| File | Change |
|------|--------|
| `app/models/auth.py` | Added `RegisterRequest`, `ForgotPasswordRequest` |
| `app/models/resident.py` | Added `SubscriptionInfo`, `SubscribeRequest`, plan fields |
| `app/models/payment.py` | Added `meals_per_day`, `duration_days` to `PlanInfo` |
| `app/models/scan.py` | Added `NOT_IN_PLAN` block, `is_guest_pass` response |
| `app/models/vendor.py` | **NEW** — full vendor CRUD schemas |
| `app/services/auth_service.py` | Added `register_resident`, `send_password_reset`, `create_firebase_user_for_invite` |
| `app/services/vendor_service.py` | **NEW** — full vendor CRUD with site sync |
| `app/services/resident_service.py` | Added `get_subscription`, `subscribe_to_plan`, `get_residents_by_site`, Firebase user creation |
| `app/services/scan_service.py` | Added `NOT_IN_PLAN` block, guest pass bypass logic |
| `app/routes/auth.py` | Added `/register`, `/forgot-password` |
| `app/routes/resident.py` | Added `/subscription`, `/subscribe` |
| `app/routes/payment.py` | Updated `/plans` with new schema |
| `app/routes/admin.py` | Added 9 new admin endpoints |
