
import firebase_admin
from firebase_admin import credentials, firestore
import json
import os

# Set path relative to project root
KEY_PATH = "serviceAccountKey.json"

if not os.path.exists(KEY_PATH):
    print(f"❌ Error: {KEY_PATH} not found in project root.")
    exit(1)

cred = credentials.Certificate(KEY_PATH)
if not firebase_admin._apps:
    firebase_admin.initialize_app(cred)

db = firestore.client()

def dump_collection(name):
    print(f"\n--- {name.upper()} ---")
    docs = db.collection(name).stream()
    count = 0
    for doc in docs:
        data = doc.to_dict()
        # Remove timestamps for cleaner output
        for k, v in data.items():
            if hasattr(v, 'isoformat'):
                data[k] = v.isoformat()
        print(f"ID: {doc.id} | Data: {json.dumps(data, indent=2)}")
        count += 1
    print(f"Total: {count}")

if __name__ == "__main__":
    dump_collection("admin_users")
    dump_collection("residents")
    dump_collection("sites")
