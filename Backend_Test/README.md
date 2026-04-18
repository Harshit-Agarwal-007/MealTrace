# MealTrace Backend — LLM-Powered Test Suite

This framework uses `pytest` + **Google Gemini** to intelligently evaluate API responses against natural-language behaviour descriptions, bypassing brittle exact-match assertions for dynamic UUIDs, JWTs, and timestamps.

---

## How It Works

```
conftest.py          → session fixture: creates test users, captures Firebase IDs
test_cases.json      → registry of all test scenarios (67 cases across every endpoint)
test_api_endpoints.py → runs each case, resolves {TEST_*_ID} placeholders, calls Gemini
llm_evaluator.py     → sends actual response to Gemini, returns {passed, score, reason}
```

### Dynamic ID Resolution (No manual .env IDs needed)

At the start of the test session, `conftest.py`:
1. Calls `POST /admin/residents` → creates a test resident → captures its **Firebase UID**
2. Calls `POST /admin/vendors`   → creates a test vendor   → captures its **Firebase UID**
3. Resolves first admin from `GET /dev/users`
4. Resolves a site from `GET /dev/sites` (or creates one)
5. Resolves a plan from `GET /plans` (or creates one)

These IDs flow into every test case that references `{TEST_RESIDENT_ID}`, `{TEST_VENDOR_ID}`, `{TEST_ADMIN_ID}`, `{TEST_SITE_ID}`, or `{TEST_PLAN_ID}` inside `test_cases.json` endpoints and payloads.

After all tests, teardown **soft-deletes** the created resident, vendor, and plan.

---

## Setup

### 1. Navigate to the test directory
```bash
cd e:\MealTrace\backend\MealTrace\Backend_Test
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure environment
```bash
copy .env.example .env
```

Edit `.env` — you only need to provide:
```env
BASE_URL=http://localhost:8000     # or your hosted GCP URL
GEMINI_API_KEY=your_key_here
DEV_LOGIN_ENABLED=true
```

> **`TEST_RESIDENT_ID`, `TEST_VENDOR_ID`, `TEST_ADMIN_ID`, `TEST_SITE_ID`, `TEST_PLAN_ID` are resolved automatically at runtime. You do NOT need to fill them in.**

### 4. Start the backend
```bash
# From the project root
uvicorn app.main:app --reload --port 8000
```

---

## Running Tests

### Full suite
```bash
pytest test_api_endpoints.py -v -s
```

### Single test by ID
```bash
pytest test_api_endpoints.py -v -s -k "admin_dashboard_stats"
```

### Only admin tests
```bash
pytest test_api_endpoints.py -v -s -k "admin_"
```

### Only resident tests
```bash
pytest test_api_endpoints.py -v -s -k "resident_"
```

### Stop on first failure
```bash
pytest test_api_endpoints.py -v -s -x
```

> The `-s` flag prints Gemini's reasoning and score for each test case.

---

## Test Coverage

| Module | Tests |
|--------|-------|
| Health | 2 |
| Dev routes | 5 |
| Authentication | 7 |
| Resident | 7 |
| Vendor | 3 |
| Scanner | 2 |
| Sites | 5 |
| Payments & Plans | 3 |
| Admin — Residents | 7 |
| Admin — Vendors | 4 |
| Admin — Sites | 2 |
| Admin — Search | 2 |
| Admin — Credits | 2 |
| Admin — Plans | 3 |
| Admin — Dashboard | 3 |
| Admin — Reports | 4 |
| Admin — Notifications | 1 |
| Auth edge cases | 3 |
| **Total** | **67** |

---

## Adding New Tests

Append a JSON object to `test_cases.json`. No Python code required.

```json
{
  "id": "my_new_test",
  "method": "GET",
  "endpoint": "/admin/residents/{TEST_RESIDENT_ID}",
  "auth_role": "SUPER_ADMIN",
  "expected_behavior": "Should return HTTP 200 with the resident profile..."
}
```

Available placeholders for dynamic values:

| Placeholder | Resolves to |
|-------------|-------------|
| `{TEST_RESIDENT_ID}` | Firebase UID of the created test resident |
| `{TEST_VENDOR_ID}` | Firebase UID of the created test vendor |
| `{TEST_ADMIN_ID}` | UID of the first SUPER_ADMIN found |
| `{TEST_SITE_ID}` | ID of the first available site |
| `{TEST_PLAN_ID}` | ID of the first available meal plan |

To skip a test conditionally, add `"skip": "reason string"` to the test case object.
