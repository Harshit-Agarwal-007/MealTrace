"""
MealTrace — LLM-Powered API Test Runner
========================================
Loads all test cases from test_cases.json, resolves dynamic ID placeholders
({TEST_RESIDENT_ID}, {TEST_VENDOR_ID}, {TEST_ADMIN_ID}, {TEST_SITE_ID},
{TEST_PLAN_ID}) against the IDs captured by the conftest.py session fixture,
and evaluates each API response via Gemini.

Run:
    pytest test_api_endpoints.py -v -s
"""

import os
import json
import copy
import pytest
import requests
from dotenv import load_dotenv
from llm_evaluator import evaluate_api_response

load_dotenv()

BASE_URL = os.getenv("BASE_URL", "http://localhost:8000")
DEV_LOGIN_ENABLED = os.getenv("DEV_LOGIN_ENABLED", "true").lower() == "true"

# ── Auth Token Cache ──────────────────────────────────────────────────────────
AUTH_CACHE: dict[str, str] = {}


def get_auth_token(role: str) -> str:
    """Fetch a JWT token for the given role via /dev/login (cached per session)."""
    if role in AUTH_CACHE:
        return AUTH_CACHE[role]

    if not DEV_LOGIN_ENABLED:
        pytest.skip("DEV_LOGIN_ENABLED is false. Manual token injection required.")

    resp = requests.post(f"{BASE_URL}/dev/login", json={"role": role}, timeout=15)
    if resp.status_code != 200:
        pytest.fail(f"Failed to get auth token for {role}. Response: {resp.text}")

    token = resp.json().get("access_token")
    AUTH_CACHE[role] = token
    return token


# ── Placeholder Resolution ────────────────────────────────────────────────────

def resolve(value, ids: dict):
    """
    Recursively replace placeholder strings in a value (str, list, dict).

    Placeholders:
        {TEST_RESIDENT_ID}  → ids["RESIDENT_ID"]
        {TEST_VENDOR_ID}    → ids["VENDOR_ID"]
        {TEST_ADMIN_ID}     → ids["ADMIN_ID"]
        {TEST_SITE_ID}      → ids["SITE_ID"]
        {TEST_PLAN_ID}      → ids["PLAN_ID"]
    """
    mapping = {
        "{TEST_RESIDENT_ID}": ids.get("RESIDENT_ID", ""),
        "{TEST_VENDOR_ID}":   ids.get("VENDOR_ID", ""),
        "{TEST_ADMIN_ID}":    ids.get("ADMIN_ID", ""),
        "{TEST_SITE_ID}":     ids.get("SITE_ID", ""),
        "{TEST_PLAN_ID}":     ids.get("PLAN_ID", ""),
    }
    if isinstance(value, str):
        for placeholder, real_id in mapping.items():
            value = value.replace(placeholder, real_id or "")
        return value
    if isinstance(value, dict):
        return {k: resolve(v, ids) for k, v in value.items()}
    if isinstance(value, list):
        return [resolve(item, ids) for item in value]
    return value


# ── Test Case Loader ──────────────────────────────────────────────────────────

def load_test_cases():
    path = os.path.join(os.path.dirname(__file__), "test_cases.json")
    with open(path, "r") as f:
        return json.load(f)


# ── Parametrized Test ─────────────────────────────────────────────────────────

@pytest.mark.parametrize("case", load_test_cases(), ids=lambda c: c["id"])
def test_api_endpoint(case, test_ids):
    """
    Data-driven test that:
    1. Resolves any dynamic ID placeholders in endpoint/payload.
    2. Obtains a JWT for the required role.
    3. Fires the HTTP request.
    4. Sends actual response + expected behaviour to Gemini for evaluation.
    5. Asserts based on Gemini's verdict.
    """
    # Deep-copy so we don't mutate the parametrize input between runs
    case = copy.deepcopy(case)

    method           = case.get("method", "GET")
    endpoint         = resolve(case.get("endpoint"), test_ids)
    payload          = resolve(case.get("payload"), test_ids)
    expected_behavior = case.get("expected_behavior")
    auth_role        = case.get("auth_role")
    skip_reason      = case.get("skip")

    if skip_reason:
        pytest.skip(skip_reason)

    url     = f"{BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json"}

    if auth_role:
        token = get_auth_token(auth_role)
        headers["Authorization"] = f"Bearer {token}"

    # ── Execute Request ───────────────────────────────────────────────────────
    try:
        method_upper = method.upper()
        if method_upper == "GET":
            response = requests.get(url, headers=headers, timeout=20)
        elif method_upper == "POST":
            response = requests.post(url, headers=headers, json=payload, timeout=20)
        elif method_upper == "PATCH":
            response = requests.patch(url, headers=headers, json=payload, timeout=20)
        elif method_upper == "DELETE":
            response = requests.delete(url, headers=headers, timeout=20)
        else:
            pytest.fail(f"Unsupported HTTP method: {method}")

        actual_status = response.status_code
        actual_body   = response.text

    except requests.exceptions.RequestException as e:
        pytest.fail(f"HTTP Request Failed: {e}")

    # ── Gemini Evaluation ─────────────────────────────────────────────────────
    print(f"\n--- Gemini Evaluation: [{case['id']}] {method} {endpoint} ---")
    evaluation = evaluate_api_response(
        endpoint=endpoint,
        expected_behavior=expected_behavior,
        actual_status=actual_status,
        actual_body=actual_body,
    )

    passed = evaluation.get("passed", False)
    score  = evaluation.get("score", 0)
    reason = evaluation.get("reason", "No reason provided.")

    print(f"  Status : {actual_status}")
    print(f"  Score  : {score}/10")
    print(f"  Passed : {passed}")
    print(f"  Reason : {reason}")

    assert passed is True, (
        f"LLM Evaluation FAILED for [{case['id']}].\n"
        f"  Score : {score}/10\n"
        f"  Reason: {reason}"
    )
