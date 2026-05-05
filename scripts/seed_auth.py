#!/usr/bin/env python3
"""
Dynamic Firebase Auth Seeder
Connects to Firestore, pulls all documents from `residents` and `admin_users`,
and provisions matching Firebase Auth accounts natively so they can log in.
All auto-provisioned accounts will have password: 'password123'
"""

import sys
import os
import firebase_admin
from firebase_admin import credentials, auth, firestore

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

cred = credentials.Certificate("serviceAccountKey.json")
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

def seed_auth():
    print("🚀 Fetching actively provisioned accounts from Firestore...\n")
    
    users_to_provision = []

    # Pull Admin/Vendor users
    admin_docs = db.collection("admin_users").stream()
    for doc in admin_docs:
        data = doc.to_dict()
        if data.get("email"):
            users_to_provision.append({
                "uid": doc.id,
                "email": data["email"],
                "name": data.get("name", "Admin User")
            })

    # Pull Residents
    res_docs = db.collection("residents").stream()
    for doc in res_docs:
        data = doc.to_dict()
        if data.get("email"):
            users_to_provision.append({
                "uid": doc.id,
                "email": data["email"],
                "name": data.get("name", "Resident")
            })

    print(f"Found {len(users_to_provision)} accounts needing Firebase Auth synchronization.")
    print("Provisioning with secure password: 'password123'...\n")

    for user_data in users_to_provision:
        try:
            # Always forcefully update the password and sync the email to match Firestore
            auth.update_user(
                user_data["uid"],
                email=user_data["email"],
                password="password123",
                display_name=user_data["name"]
            )
            print(f"✅ Synced existing auth user: {user_data['email']}")
        except auth.UserNotFoundError:
            try:
                auth.create_user(
                    uid=user_data["uid"],
                    email=user_data["email"],
                    email_verified=True,
                    password="password123",
                    display_name=user_data["name"]
                )
                print(f"✨ Successfully created auth user: {user_data['email']}")
            except Exception as e:
                print(f"❌ Failed to create {user_data['email']}: {e}")

if __name__ == "__main__":
    seed_auth()
