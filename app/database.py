# app/database.py
"""
Firebase Admin SDK initialization and Firestore client singleton.
Uses a module-level factory to ensure Firebase is initialized exactly once.
"""

import firebase_admin
from firebase_admin import credentials, firestore, auth as firebase_auth, messaging
from app.config import get_settings


_db_client = None


def _init_firebase():
    """Initialize Firebase Admin SDK if not already initialized."""
    settings = get_settings()
    if not firebase_admin._apps:
        cred = credentials.Certificate(settings.FIREBASE_KEY_PATH)
        firebase_admin.initialize_app(cred)


def get_db() -> firestore.firestore.Client:
    """Return Firestore client singleton."""
    global _db_client
    if _db_client is None:
        _init_firebase()
        _db_client = firestore.client()
    return _db_client


def get_firebase_auth():
    """Return Firebase Auth module (for verifying tokens, creating users)."""
    _init_firebase()
    return firebase_auth


def get_firebase_messaging():
    """Return Firebase Messaging module (for FCM push notifications)."""
    _init_firebase()
    return messaging
