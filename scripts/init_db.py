#!/usr/bin/env python3
"""
MealTrace Digital — Database Schema Initializer

Run this script to seed Firestore with the initial schema and sample data.
Usage: python scripts/init_db.py

This creates all required collections with sample documents so that
the schema is visible in Firebase Console and Rakshit can build
Flutter models from these field definitions.
"""

import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import firebase_admin
from firebase_admin import credentials, firestore
from datetime import datetime, timezone, timedelta

# Initialize Firebase
cred = credentials.Certificate("serviceAccountKey.json")
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)
db = firestore.client()


def seed_database():
    """Seed all Firestore collections with initial data."""
    print("🚀 MealTrace Digital — Seeding Firestore Schema\n")
    now = datetime.now(timezone.utc)

    # ─────────────────────────────────────────────────
    # 1. SITES
    # ─────────────────────────────────────────────────
    sites = [
        {
            "id": "site_north_001",
            "data": {
                "name": "Manish PG — North Wing",
                "meal_windows": {
                    "breakfast": {"start": "07:30", "end": "09:30"},
                    "lunch": {"start": "12:30", "end": "14:30"},
                    "dinner": {"start": "19:30", "end": "21:30"},
                },
                "vendor_staff_ids": ["vendor_user_001"],
                "is_active": True,
                "created_at": now,
            },
        },
        {
            "id": "site_south_002",
            "data": {
                "name": "Manish PG — South Wing",
                "meal_windows": {
                    "breakfast": {"start": "08:00", "end": "10:00"},
                    "lunch": {"start": "13:00", "end": "15:00"},
                    "dinner": {"start": "20:00", "end": "22:00"},
                },
                "vendor_staff_ids": ["vendor_user_002"],
                "is_active": True,
                "created_at": now,
            },
        },
    ]
    for site in sites:
        db.collection("sites").document(site["id"]).set(site["data"])
    print(f"  ✅ sites — {len(sites)} documents created")

    # ─────────────────────────────────────────────────
    # 2. RESIDENTS
    # ─────────────────────────────────────────────────
    residents = [
        {
            "id": "res_harshit_007",
            "data": {
                "name": "Harshit Agarwal",
                "email": "harshit@example.com",
                "phone": "+919876543210",
                "room_number": "B-102",
                "site_id": "site_north_001",
                "balance": 30,
                "status": "ACTIVE",
                "fcm_token": None,
                "qr_signed_payload": None,
                "created_at": now,
            },
        },
        {
            "id": "res_test_001",
            "data": {
                "name": "Test Resident",
                "email": "test@example.com",
                "phone": "+919876543211",
                "room_number": "A-201",
                "site_id": "site_north_001",
                "balance": 15,
                "status": "ACTIVE",
                "fcm_token": None,
                "qr_signed_payload": None,
                "created_at": now,
            },
        },
    ]
    for res in residents:
        db.collection("residents").document(res["id"]).set(res["data"])
    print(f"  ✅ residents — {len(residents)} documents created")

    # ─────────────────────────────────────────────────
    # 3. PLANS
    # ─────────────────────────────────────────────────
    plans = [
        {"id": "plan_30", "name": "Standard 30", "meal_count": 30, "price": 1500},
        {"id": "plan_60", "name": "Value 60", "meal_count": 60, "price": 2800},
        {"id": "plan_90", "name": "Premium 90", "meal_count": 90, "price": 4000},
    ]
    for plan in plans:
        pid = plan.pop("id")
        db.collection("plans").document(pid).set(plan)
    print(f"  ✅ plans — {len(plans)} documents created")

    # ─────────────────────────────────────────────────
    # 4. ADMIN_USERS
    # ─────────────────────────────────────────────────
    admins = [
        {
            "id": "admin_manish_001",
            "data": {
                "name": "Manish Kumar",
                "email": "manish@catering.com",
                "role": "SUPER_ADMIN",
                "site_id": None,
                "fcm_token": None,
                "created_at": now,
            },
        },
        {
            "id": "vendor_user_001",
            "data": {
                "name": "Vendor Staff 1",
                "email": "vendor1@catering.com",
                "role": "VENDOR",
                "site_id": "site_north_001",
                "fcm_token": None,
                "created_at": now,
            },
        },
        {
            "id": "vendor_user_002",
            "data": {
                "name": "Vendor Staff 2",
                "email": "vendor2@catering.com",
                "role": "VENDOR",
                "site_id": "site_south_002",
                "fcm_token": None,
                "created_at": now,
            },
        },
    ]
    for admin in admins:
        db.collection("admin_users").document(admin["id"]).set(admin["data"])
    print(f"  ✅ admin_users — {len(admins)} documents created")

    # ─────────────────────────────────────────────────
    # 5. PAYMENTS (sample)
    # ─────────────────────────────────────────────────
    db.collection("payments").document("pay_sample_001").set({
        "resident_id": "res_harshit_007",
        "plan_id": "plan_30",
        "razorpay_order_id": "order_SAMPLE123",
        "razorpay_payment_id": "pay_SAMPLE123",
        "amount": 1500,
        "status": "SUCCESS",
        "type": "plan_purchase",
        "timestamp": now,
    })
    print("  ✅ payments — 1 sample document created")

    # ─────────────────────────────────────────────────
    # 6. SCAN_LOGS (sample)
    # ─────────────────────────────────────────────────
    db.collection("scan_logs").document("log_sample_001").set({
        "resident_id": "res_harshit_007",
        "site_id": "site_north_001",
        "vendor_id": "vendor_user_001",
        "meal_type": "LUNCH",
        "status": "SUCCESS",
        "block_reason": None,
        "timestamp": now,
    })
    print("  ✅ scan_logs — 1 sample document created")

    # ─────────────────────────────────────────────────
    # 7. GUEST_PASSES (sample)
    # ─────────────────────────────────────────────────
    db.collection("guest_passes").document("guest_sample_001").set({
        "resident_id": "res_harshit_007",
        "site_id": "site_north_001",
        "meal_type": None,
        "qr_payload": "guest_signed_payload_placeholder",
        "status": "UNUSED",
        "expiry_at": now + timedelta(hours=24),
        "created_at": now,
    })
    print("  ✅ guest_passes — 1 sample document created")

    # ─────────────────────────────────────────────────
    # 8. CREDIT_OVERRIDES (empty — created by admin actions)
    # ─────────────────────────────────────────────────
    print("  ⏭️  credit_overrides — collection created on first admin override")

    print("\n✅ All collections seeded successfully!")
    print("\n📋 Firestore Schema Summary:")
    print("   ├── sites           — PG locations + meal window config")
    print("   ├── residents       — Profiles, balance, QR payloads")
    print("   ├── plans           — 30/60/90 meal pack definitions")
    print("   ├── admin_users     — Admin + vendor staff (role-based)")
    print("   ├── payments        — Razorpay transaction records")
    print("   ├── scan_logs       — Every scan attempt (success + blocked)")
    print("   ├── guest_passes    — Single-use guest QR codes")
    print("   └── credit_overrides — Admin manual credit changes")


if __name__ == "__main__":
    seed_database()