import firebase_admin
from firebase_admin import credentials, firestore

# 1. Initialize the SDK
cred = credentials.Certificate("serviceAccountKey.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

def initialize_schema():
    # Define the collections from your Tier 1 MVP plan 
    collections = {
        "residents": {
            "name": "Seed Resident",
            "balance": 0,
            "site_id": "site_001",
            "status": "ACTIVE"
        },
        "sites": {
            "name": "Main PG Site",
            "meal_windows": {
                "breakfast": {"start": "08:00", "end": "10:00"},
                "lunch": {"start": "13:00", "end": "15:00"},
                "dinner": {"start": "20:00", "end": "22:00"}
            }
        },
        "plans": {
            "name": "30 Meal Pack",
            "meal_count": 30,
            "price": 1500
        },
        "admin_users": {
            "email": "harshit@example.com",
            "role": "SUPER_ADMIN"
        }
    }

    for coll_name, data in collections.items():
        # Creating a 'seed' document to initialize the collection
        db.collection(coll_name).document("seed_doc").set(data)
        print(f"Collection '{coll_name}' initialized.")

if __name__ == "__main__":
    initialize_schema()