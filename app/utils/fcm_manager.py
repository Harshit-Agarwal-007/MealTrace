# app/utils/fcm_manager.py
"""
Firebase Cloud Messaging (FCM) push notification utility.

Triggers notifications for:
  - Successful scan
  - Low credit alert (balance ≤ 5)
  - Payment confirmation
"""

import logging
from typing import Optional, Dict

from firebase_admin import messaging

from app.database import get_db

logger = logging.getLogger(__name__)


# ── Notification Types ──
NOTIFICATION_TYPES = {
    "SCAN_SUCCESS": {
        "title": "Meal Scanned ✅",
        "body_template": "Your {meal_type} has been recorded. Balance: {balance} meals remaining.",
    },
    "CREDIT_LOW": {
        "title": "Low Balance ⚠️",
        "body_template": "You have only {balance} meals remaining. Recharge now to avoid interruption.",
    },
    "PAYMENT_CONFIRMED": {
        "title": "Payment Successful 💰",
        "body_template": "{meal_count} meals added to your account. New balance: {balance}.",
    },
    "CREDIT_OVERRIDE": {
        "title": "Balance Updated",
        "body_template": "Your balance has been updated by admin. New balance: {balance} meals.",
    },
    "GUEST_PASS_ISSUED": {
        "title": "Guest Pass Ready 🎟️",
        "body_template": "Your guest pass is ready. It expires in 24 hours.",
    },
}


def _get_fcm_token(resident_id: str) -> Optional[str]:
    """
    Retrieve the FCM device token for a resident from Firestore.
    Residents store their FCM token during app login/registration.
    """
    db = get_db()
    doc = db.collection("residents").document(resident_id).get()
    if doc.exists:
        return doc.to_dict().get("fcm_token")
    return None


def send_notification(
    resident_id: str,
    notification_type: str,
    payload: Optional[Dict[str, str]] = None,
) -> bool:
    """
    Send a push notification to a resident's device.

    Args:
        resident_id: Target resident's Firestore document ID.
        notification_type: One of NOTIFICATION_TYPES keys.
        payload: dict with template variables (e.g. meal_type, balance, meal_count).

    Returns:
        True if sent successfully, False otherwise.
    """
    if payload is None:
        payload = {}

    fcm_token = _get_fcm_token(resident_id)
    if not fcm_token:
        logger.warning(f"No FCM token found for resident {resident_id}, skipping notification.")
        return False

    notification_config = NOTIFICATION_TYPES.get(notification_type)
    if not notification_config:
        logger.error(f"Unknown notification type: {notification_type}")
        return False

    title = notification_config["title"]
    body = notification_config["body_template"].format(**payload)

    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data={
                "type": notification_type,
                "resident_id": resident_id,
                **{k: str(v) for k, v in payload.items()},
            },
            token=fcm_token,
        )
        response = messaging.send(message)
        logger.info(f"FCM sent to {resident_id}: {response}")
        return True
    except Exception as e:
        logger.error(f"FCM send failed for {resident_id}: {e}")
        return False


def send_low_balance_alert(resident_id: str, balance: int) -> bool:
    """Convenience: trigger low-balance alert if balance ≤ 5."""
    if balance <= 5:
        return send_notification(
            resident_id,
            "CREDIT_LOW",
            {"balance": str(balance)},
        )
    return False
