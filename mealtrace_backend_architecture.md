# MealTrace Digital — Backend Architecture & Implementation

> **Status**: ✅ Complete — All files implemented, server starts successfully  
> **Server**: `uvicorn app.main:app --reload --host 0.0.0.0 --port 8000`  
> **Docs**: `http://localhost:8000/docs` (Swagger UI) | `http://localhost:8000/redoc` (ReDoc)

---

## Project Structure

```
MealTrace/
├── app/
│   ├── __init__.py
│   ├── config.py                  # Pydantic settings from .env
│   ├── database.py                # Firebase Admin SDK + Firestore singleton
│   ├── main.py                    # FastAPI app, CORS, routers, error handling
│   │
│   ├── models/                    # Pydantic request/response schemas
│   │   ├── auth.py                # UserRole enum, LoginRequest, TokenResponse
│   │   ├── resident.py            # ResidentProfile, QRCodeResponse, TransactionList
│   │   ├── scan.py                # ScanStatus, BlockReason (6 conditions), ScanValidateResponse
│   │   ├── payment.py             # PlanInfo, CreateOrderResponse, CreditOverride, GuestPass
│   │   ├── site.py                # SiteInfo, MealWindow, CreateSiteRequest
│   │   └── common.py              # APIResponse, ErrorResponse
│   │
│   ├── middleware/
│   │   └── auth.py                # JWT creation/validation, RBAC guards (require_admin, etc.)
│   │
│   ├── services/                  # Business logic (pure Python, DB-calling)
│   │   ├── auth_service.py        # Firebase token → JWT pair, role lookup, FCM token storage
│   │   ├── scan_service.py        # ★ Core scan engine — 6 hard-blocks + atomic deduction
│   │   ├── payment_service.py     # Razorpay orders, webhook processing, credit override
│   │   ├── resident_service.py    # Profile CRUD, QR gen, transactions, bulk import
│   │   ├── site_service.py        # Site CRUD + meal window config
│   │   └── report_service.py      # Excel export: weekly, financial, residents, successful scans
│   │
│   ├── routes/                    # FastAPI APIRouter modules
│   │   ├── auth.py                # POST /auth/login, /auth/refresh-token, /auth/logout
│   │   ├── resident.py            # GET /resident/profile, /qr-code, /balance, /transactions
│   │   ├── scan.py                # POST /scan/validate
│   │   ├── payment.py             # POST /payments/create-order, /payments/webhook, etc.
│   │   ├── site.py                # GET/POST/PATCH /sites
│   │   └── admin.py               # Full admin suite (residents, reports, dashboard)
│   │
│   └── utils/                     # Standalone utility modules
│       ├── qr_gen.py              # HMAC-SHA256 signed QR generation + verification
│       ├── fcm_manager.py         # FCM push notification sender
│       └── razorpay_client.py     # Razorpay order creation + webhook signature validation
│
├── scripts/
│   └── init_db.py                 # Firestore schema seeder with sample data
│
├── firestore.rules                # Firestore security rules (role-based)
├── requirements.txt               # All Python dependencies (pinned)
├── .env                           # Environment variables (gitignored)
├── .env.example                   # Template for .env
└── serviceAccountKey.json         # Firebase Admin SDK key (gitignored)
```

---

## API Endpoints (35 routes registered)

### Authentication (`/auth`)
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/auth/login` | All | Firebase ID token → JWT pair |
| POST | `/auth/refresh-token` | All | Refresh expired access token |
| POST | `/auth/logout` | Auth | Discard tokens (client-side) |
| POST | `/auth/fcm-token` | Auth | Update FCM device token |

### Resident (`/resident`)
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/resident/profile` | Resident | Profile data (name, room, site, balance) |
| GET | `/resident/qr-code` | Resident | Signed QR code as base64 PNG |
| GET | `/resident/balance` | Resident | Credit count + plan info |
| GET | `/resident/transactions` | Resident | Paginated scan history |

### Scanner (`/scan`)
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/scan/validate` | Vendor/Admin | **Core engine** — 6 hard-block checks + atomic deduction |

### Payments & Plans
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/payments/create-order` | Resident | Create Razorpay order |
| POST | `/payments/webhook` | System | Razorpay webhook (signature validated) |
| GET | `/plans/active` | Public | List available meal plans |
| POST | `/guest-pass/purchase` | Resident/Admin | Issue single-use guest QR |

### Sites (`/sites`)
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/sites` | Vendor/Admin | List all sites + meal windows |
| GET | `/sites/{id}` | Vendor/Admin | Get specific site |
| POST | `/sites` | Admin | Create new PG site |
| PATCH | `/sites/{id}` | Admin | Update site config |

### Admin (`/admin`)
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/admin/residents` | Admin | Paginated list + search/filter |
| POST | `/admin/residents` | Admin | Add individual resident |
| POST | `/admin/residents/bulk` | Admin | CSV bulk import |
| PATCH | `/admin/residents/{id}` | Admin | Edit resident profile |
| DELETE | `/admin/residents/{id}` | Admin | Soft-delete + invalidate QR |
| POST | `/admin/credit-override` | Admin | Manual credit add/deduct |
| GET | `/admin/reports/weekly` | Admin | Excel download |
| GET | `/admin/reports/financial` | Admin | Excel download (optional `start_date`, `end_date` query, YYYY-MM-DD UTC) |
| GET | `/admin/reports/residents` | Admin | Excel roster |
| GET | `/admin/reports/scans` | Admin | Excel successful scans (date range) |
| GET | `/admin/dashboard/stats` | Admin | Live stats (counts, meals today) |
| GET | `/admin/dashboard/scan-feed` | Admin | Recent scan activity feed |

---

## Key Architecture Decisions

### 1. Atomic Scan Validation (Firestore Transactions)
The `POST /scan/validate` endpoint uses **Firestore Transactions** to atomically:
- Read the resident's current balance
- Deduct 1 credit
- Write the scan log entry

This prevents race conditions from concurrent scans (e.g., two vendors scanning the same QR simultaneously).

### 2. Cryptographic QR Signing (HMAC-SHA256)
QR payloads are signed with `HMAC-SHA256` using a server-side secret. The payload format:
```
base64(json({rid, sid, ts, sig}))
```
This prevents QR forgery — only the backend can generate valid payloads.

### 3. Razorpay Webhook Security
The `/payments/webhook` endpoint validates the `X-Razorpay-Signature` header using HMAC-SHA256. **Credits are only added on valid webhooks** — this is the single source of truth for payment confirmation.

### 4. IST-Aware Meal Windows
Meal window checks use IST (UTC+05:30) since all PG sites are in India. The `_get_current_meal_type()` function compares the current IST time against configurable per-site windows.

---

## Firestore Collections Schema

| Collection | Key Fields | Purpose |
|------------|-----------|---------|
| `sites` | name, meal_windows, vendor_staff_ids, is_active | PG site config |
| `residents` | name, email, phone, room_number, site_id, balance, status, fcm_token, qr_signed_payload | Resident profiles |
| `plans` | name, meal_count, price | 30/60/90 meal pack definitions |
| `admin_users` | name, email, role (SUPER_ADMIN/VENDOR), site_id | Staff accounts |
| `payments` | resident_id, plan_id, razorpay_order_id, amount, status | Payment records |
| `scan_logs` | resident_id, site_id, vendor_id, meal_type, status, block_reason | Every scan attempt |
| `guest_passes` | resident_id, qr_payload, status (UNUSED/USED), expiry_at | Single-use guest QRs |
| `credit_overrides` | resident_id, admin_id, amount, reason, previous_balance, new_balance | Admin audit trail |

---

## Quick Start

```bash
# 1. Activate virtual environment
source venv/bin/activate

# 2. Fill in .env (copy from .env.example)
cp .env.example .env
# Edit .env with your actual secrets

# 3. Seed Firestore (first time only)
python scripts/init_db.py

# 4. Start the development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 5. Open API docs
open http://localhost:8000/docs
```

---

## Handoff Checklist for Rakshit (Day 6)

- [x] **Hosted API URL** — Share the staging deployment URL
- [x] **Postman Collection** — Export from `/docs` (OpenAPI spec at `/openapi.json`)
- [x] **Firestore Schema Doc** — See Collections Schema section above
- [x] **FCM Config** — Share `google-services.json` from Firebase Console
- [x] **Response Codes** — All 6 block conditions documented in `BlockReason` enum
