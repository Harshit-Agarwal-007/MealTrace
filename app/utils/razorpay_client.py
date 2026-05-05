# app/utils/razorpay_client.py
"""
Razorpay payment gateway integration.

Handles:
  - Order creation for plan/guest pass purchases
  - Webhook signature validation
  - Payment verification
"""

import hmac
import hashlib
import logging
from typing import Optional

import razorpay

from app.config import get_settings

logger = logging.getLogger(__name__)

_client = None


def get_razorpay_client() -> razorpay.Client:
    """Return Razorpay client singleton."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )
    return _client


def create_order(amount_paise: int, currency: str = "INR", receipt: str = "", notes: dict = None) -> dict:
    """
    Create a Razorpay order.

    Args:
        amount_paise: Amount in paise (₹1500 = 150000).
        currency: Currency code (default INR).
        receipt: Internal receipt ID for tracking.
        notes: Additional metadata attached to the order.

    Returns:
        Razorpay order dict with 'id', 'amount', 'currency', 'status'.
    """
    client = get_razorpay_client()
    order_data = {
        "amount": amount_paise,
        "currency": currency,
        "receipt": receipt,
    }
    if notes:
        order_data["notes"] = notes

    try:
        order = client.order.create(data=order_data)
        logger.info(f"Razorpay order created: {order['id']} for ₹{amount_paise / 100}")
        return order
    except Exception as e:
        logger.error(f"Razorpay order creation failed: {e}")
        raise


def verify_webhook_signature(payload_body: bytes, signature: str) -> bool:
    """
    Validate Razorpay webhook signature to prevent fraudulent callbacks.

    The signature is an HMAC-SHA256 of the raw request body using the
    webhook secret as the key.

    Args:
        payload_body: Raw request body bytes.
        signature: X-Razorpay-Signature header value.

    Returns:
        True if signature is valid.
    """
    settings = get_settings()
    expected_sig = hmac.new(
        settings.RAZORPAY_WEBHOOK_SECRET.encode("utf-8"),
        payload_body,
        hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(expected_sig, signature)


def verify_payment_signature(order_id: str, payment_id: str, signature: str) -> bool:
    """
    Verify payment signature for client-side payment confirmation.
    Used as an additional check after Razorpay checkout.
    """
    client = get_razorpay_client()
    try:
        client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        })
        return True
    except razorpay.errors.SignatureVerificationError:
        return False
