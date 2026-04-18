# Backend_Test/conftest.py
"""
Session-scoped pytest fixtures.

Creates real test users via the API at the start of the test session and
captures the Firebase UIDs returned by the backend. These IDs are then
injected into every test case that needs them, completely replacing the need
for hard-coded TEST_ADMIN_ID / TEST_VENDOR_ID / TEST_RESIDENT_ID in .env.

Teardown: soft-deletes the created resident and vendor after all tests are done.
"""

import os
import uuid
import pytest
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
DEV_LOGIN_ENABLED = os.getenv("DEV_LOGIN_ENABLED", "true").lower() == "true"


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _get_token(role: str) -> str:
    """Fetch a JWT for a role using the /dev/login endpoint."""
    resp = requests.post(f"{BASE_URL}/dev/login", json={"role": role}, timeout=15)
    resp.raise_for_status()
    return resp.json()["access_token"]


def _admin_headers() -> dict:
    return {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {_get_token('SUPER_ADMIN')}",
    }


# ─── Session Fixture ──────────────────────────────────────────────────────────

@pytest.fixture(scope="session")
def test_ids():
    """
    Creates one test resident + one test vendor at the start of the session.
    Returns a dict:
        {
            "RESIDENT_ID": "<firebase-uid>",
            "VENDOR_ID":   "<firebase-uid>",
            "ADMIN_ID":    "<firebase-uid>",
            "SITE_ID":     "<site-id>",
            "PLAN_ID":     "<plan-id>",
        }
    Cleans up (soft-deletes) created resources at the end.
    """
    if not DEV_LOGIN_ENABLED:
        pytest.skip("DEV_LOGIN_ENABLED is false — cannot create dynamic test users.")

    headers = _admin_headers()
    uid_suffix = uuid.uuid4().hex[:6]

    created_resident_id = None
    created_vendor_id = None
    created_plan_id = None

    # ── 1. Resolve admin ID ───────────────────────────────────────────────────
    admin_id = None
    try:
        resp = requests.get(f"{BASE_URL}/dev/users", timeout=10)
        if resp.status_code == 200:
            users = resp.json().get("users", [])
            for u in users:
                if u.get("role") == "SUPER_ADMIN":
                    admin_id = u["id"]
                    break
    except Exception:
        pass

    # ── 2. Resolve / create a site ────────────────────────────────────────────
    site_id = None
    try:
        resp = requests.get(f"{BASE_URL}/dev/sites", timeout=10)
        if resp.status_code == 200:
            sites = resp.json().get("sites", [])
            if sites:
                site_id = sites[0]["id"]
    except Exception:
        pass

    if site_id is None:
        # Create a test site
        payload = {
            "name": f"Test Site {uid_suffix}",
            "meal_windows": {
                "BREAKFAST": {"start": "07:00", "end": "09:00"},
                "LUNCH":     {"start": "12:00", "end": "14:00"},
                "DINNER":    {"start": "19:00", "end": "21:00"},
            },
        }
        resp = requests.post(f"{BASE_URL}/sites", headers=headers, json=payload, timeout=15)
        if resp.status_code in (200, 201):
            site_id = resp.json().get("id", "site_test")

    # ── 3. Resolve / create a plan ────────────────────────────────────────────
    plan_id = None
    try:
        resp = requests.get(f"{BASE_URL}/plans", headers=headers, timeout=10)
        if resp.status_code == 200:
            plans = resp.json()
            if isinstance(plans, list) and plans:
                plan_id = plans[0]["id"]
    except Exception:
        pass

    if plan_id is None:
        payload = {
            "name": f"Test Plan {uid_suffix}",
            "meals_per_day": 1,
            "meal_count": 30,
            "duration_days": 30,
            "price": 2000,
        }
        resp = requests.post(f"{BASE_URL}/admin/plans", headers=headers, json=payload, timeout=15)
        if resp.status_code in (200, 201):
            plan_id = resp.json().get("id")
            created_plan_id = plan_id

    # ── 4. Create test resident ───────────────────────────────────────────────
    resident_id = None
    resident_payload = {
        "name": f"Test Resident {uid_suffix}",
        "email": f"test_resident_{uid_suffix}@mealtrace.test",
        "phone": "9000000000",
        "room_number": f"R{uid_suffix}",
        "site_id": site_id or "site_default",
        "password": "TestPass@123",
    }
    resp = requests.post(
        f"{BASE_URL}/admin/residents", headers=headers, json=resident_payload, timeout=15
    )
    if resp.status_code in (200, 201):
        resident_id = resp.json().get("id")
        created_resident_id = resident_id
    else:
        # Fall back to the first resident in dev/users
        try:
            resp2 = requests.get(f"{BASE_URL}/dev/users", timeout=10)
            if resp2.status_code == 200:
                for u in resp2.json().get("users", []):
                    if u.get("role") == "RESIDENT":
                        resident_id = u["id"]
                        break
        except Exception:
            pass

    # ── 5. Create test vendor ─────────────────────────────────────────────────
    vendor_id = None
    vendor_payload = {
        "name": f"Test Vendor {uid_suffix}",
        "email": f"test_vendor_{uid_suffix}@mealtrace.test",
        "phone": "9100000000",
        "password": "TestPass@123",
        "assigned_site_ids": [site_id] if site_id else [],
    }
    resp = requests.post(
        f"{BASE_URL}/admin/vendors", headers=headers, json=vendor_payload, timeout=15
    )
    if resp.status_code in (200, 201):
        vendor_id = resp.json().get("id")
        created_vendor_id = vendor_id
    else:
        # Fall back to first vendor in dev/users
        try:
            resp2 = requests.get(f"{BASE_URL}/dev/users", timeout=10)
            if resp2.status_code == 200:
                for u in resp2.json().get("users", []):
                    if u.get("role") == "VENDOR":
                        vendor_id = u["id"]
                        break
        except Exception:
            pass

    ids = {
        "RESIDENT_ID": resident_id or "RESIDENT_NOT_CREATED",
        "VENDOR_ID":   vendor_id   or "VENDOR_NOT_CREATED",
        "ADMIN_ID":    admin_id    or "ADMIN_NOT_FOUND",
        "SITE_ID":     site_id     or "SITE_NOT_FOUND",
        "PLAN_ID":     plan_id     or "PLAN_NOT_FOUND",
    }

    print(f"\n[conftest] Dynamic Test IDs: {ids}")
    yield ids

    # ── 6. Teardown ───────────────────────────────────────────────────────────
    try:
        teardown_headers = _admin_headers()
        if created_resident_id:
            requests.delete(
                f"{BASE_URL}/admin/residents/{created_resident_id}",
                headers=teardown_headers, timeout=10
            )
        if created_vendor_id:
            requests.delete(
                f"{BASE_URL}/admin/vendors/{created_vendor_id}",
                headers=teardown_headers, timeout=10
            )
        if created_plan_id:
            requests.delete(
                f"{BASE_URL}/admin/plans/{created_plan_id}",
                headers=teardown_headers, timeout=10
            )
        print("[conftest] Teardown complete — test resources soft-deleted.")
    except Exception as e:
        print(f"[conftest] Teardown warning: {e}")
