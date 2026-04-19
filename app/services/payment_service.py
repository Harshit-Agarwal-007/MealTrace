# app/services/payment_service.py
"""
Payment service — Razorpay order creation, webhook processing, credit top-up.

Key invariant:
  - Credits are ONLY added on webhook SUCCESS with valid signature.
  - Failed payments result in NO balance change.
"""

import logging
import uuid
from datetime import datetime, timezone

from app.database import get_db
from app.models.payment import (
    CreateOrderResponse,
    CreditOverrideResponse,
    GuestPassResponse,
)
from app.utils.razorpay_client import create_order, verify_webhook_signature
from app.utils.qr_gen import generate_qr_payload, generate_qr_image_base64
from app.utils.fcm_manager import send_notification
from app.config import get_settings

logger = logging.getLogger(__name__)


def create_payment_order(
    resident_id: str,
    plan_id: str = None,
    guest_pass: bool = False,
    amount_override: int = None,
) -> CreateOrderResponse:
    """
    Create a Razorpay order for plan purchase or guest pass.

    For plans: looks up the plan price from Firestore.
    For guest passes: uses a fixed price or override.
    """
    db = get_db()
    settings = get_settings()

    if guest_pass:
        amount_inr = amount_override or 100  # ₹100 default guest pass price
        receipt = f"guest_{resident_id}_{uuid.uuid4().hex[:8]}"
        notes = {"type": "guest_pass", "resident_id": resident_id}
    else:
        # Look up plan
        plan_doc = db.collection("plans").document(plan_id).get()
        if not plan_doc.exists:
            raise ValueError(f"Plan {plan_id} not found")

        plan = plan_doc.to_dict()
        amount_inr = plan["price"]
        receipt = f"plan_{plan_id}_{resident_id}_{uuid.uuid4().hex[:8]}"
        notes = {
            "type": "plan_purchase",
            "resident_id": resident_id,
            "plan_id": plan_id,
            "meal_count": str(plan["meal_count"]),
        }

    # Create Razorpay order (amount in paise)
    order = create_order(
        amount_paise=amount_inr * 100,
        currency="INR",
        receipt=receipt,
        notes=notes,
    )

    expected_amount_paise = order["amount"]
    # Store pending payment record
    db.collection("payments").add({
        "resident_id": resident_id,
        "plan_id": plan_id,
        "razorpay_order_id": order["id"],
        "razorpay_payment_id": None,
        "amount": expected_amount_paise,
        "currency": order["currency"],
        "status": "PENDING",
        "type": "guest_pass" if guest_pass else "plan_purchase",
        "timestamp": datetime.now(timezone.utc),
    })

    return CreateOrderResponse(
        order_id=order["id"],
        amount=order["amount"],
        currency=order["currency"],
        razorpay_key_id=settings.RAZORPAY_KEY_ID,
        resident_id=resident_id,
    )


def process_webhook(payload_body: bytes, signature: str, event_data: dict) -> bool:
    """
    Process Razorpay webhook — validate signature, then atomically credit balance.

    CRITICAL: This is the ONLY path that adds credits for purchases.
    The signature MUST be verified to prevent fraudulent top-ups.
    """
    # ── Verify signature ──
    if not verify_webhook_signature(payload_body, signature):
        logger.error("Razorpay webhook signature verification FAILED — possible fraud attempt")
        return False

    event = event_data.get("event", "")
    if event != "payment.captured":
        logger.info(f"Ignoring webhook event: {event}")
        return True  # Not an error, just not relevant

    payment_entity = event_data.get("payload", {}).get("payment", {}).get("entity", {})
    order_id = payment_entity.get("order_id")
    payment_id = payment_entity.get("id")
    notes = payment_entity.get("notes", {})

    if not order_id:
        logger.error("Webhook missing order_id")
        return False

    db = get_db()

    payment_query = (
        db.collection("payments")
        .where("razorpay_order_id", "==", order_id)
        .limit(1)
        .get()
    )

    payment_doc = None
    for doc in payment_query:
        payment_doc = doc
        break

    if not payment_doc:
        logger.error(f"No payment record found for order {order_id}")
        return False

    payment_data = payment_doc.to_dict()
    if payment_data.get("status") == "SUCCESS":
        logger.info(f"Duplicate webhook delivery ignored for order {order_id}")
        return True
    if payment_data.get("status") == "FAILED":
        logger.warning(f"Webhook received for failed order {order_id}")
        return False

    resident_id = payment_data["resident_id"]
    plan_id = payment_data.get("plan_id")
    payment_type = payment_data.get("type", "plan_purchase")
    expected_amount = payment_data.get("amount")
    expected_currency = payment_data.get("currency", "INR")
    captured_amount = payment_entity.get("amount")
    captured_currency = payment_entity.get("currency", "INR")

    if expected_amount is not None and captured_amount != expected_amount:
        logger.error(f"Amount mismatch for order {order_id}: expected={expected_amount}, actual={captured_amount}")
        db.collection("payments").document(payment_doc.id).update({
            "status": "FAILED",
            "error": "amount_mismatch",
            "failed_at": datetime.now(timezone.utc),
        })
        return False
    if captured_currency != expected_currency:
        logger.error(f"Currency mismatch for order {order_id}: expected={expected_currency}, actual={captured_currency}")
        db.collection("payments").document(payment_doc.id).update({
            "status": "FAILED",
            "error": "currency_mismatch",
            "failed_at": datetime.now(timezone.utc),
        })
        return False

    # ── Atomic credit top-up via Firestore transaction ──
    from google.cloud.firestore_v1 import transaction as firestore_transaction

    @firestore_transaction.transactional
    def txn_credit(transaction, resident_ref, pay_ref):
        resident_snap = resident_ref.get(transaction=transaction)
        if not resident_snap.exists:
            raise ValueError(f"Resident {resident_id} not found")

        current_balance = resident_snap.get("balance") or 0

        if payment_type == "guest_pass":
            credits_to_add = 0
        else:
            # Look up plan meal count
            plan_doc = db.collection("plans").document(plan_id).get()
            if plan_doc.exists:
                credits_to_add = plan_doc.to_dict().get("meal_count", 0)
            else:
                credits_to_add = 0

        new_balance = current_balance + credits_to_add

        # Update resident balance
        transaction.update(resident_ref, {"balance": new_balance})

        # Mark payment as SUCCESS
        transaction.update(pay_ref, {
            "status": "SUCCESS",
            "razorpay_payment_id": payment_id,
            "completed_at": datetime.now(timezone.utc),
        })

        return new_balance, credits_to_add

    try:
        resident_ref = db.collection("residents").document(resident_id)
        payment_ref = db.collection("payments").document(payment_doc.id)

        transaction = db.transaction()
        new_balance, credits_added = txn_credit(transaction, resident_ref, payment_ref)

        logger.info(
            f"Payment webhook processed: {resident_id} +{credits_added} credits. "
            f"New balance: {new_balance}"
        )

        # Send FCM notification
        try:
            send_notification(
                resident_id,
                "PAYMENT_CONFIRMED",
                {"meal_count": str(credits_added), "balance": str(new_balance)},
            )
        except Exception as e:
            logger.warning(f"FCM notification failed (non-critical): {e}")

        return True

    except Exception as e:
        logger.error(f"Payment webhook transaction failed: {e}")
        # Mark payment as FAILED
        try:
            db.collection("payments").document(payment_doc.id).update({
                "status": "FAILED",
                "error": str(e),
            })
        except Exception:
            pass
        return False


def credit_override(
    resident_id: str,
    amount: int,
    reason: str,
    admin_id: str,
) -> CreditOverrideResponse:
    """
    Admin manually adds or deducts credits.

    Positive amount = add credits.
    Negative amount = deduct credits.
    """
    db = get_db()
    resident_ref = db.collection("residents").document(resident_id)
    resident_doc = resident_ref.get()

    if not resident_doc.exists:
        raise ValueError(f"Resident {resident_id} not found")

    resident = resident_doc.to_dict()
    previous_balance = resident.get("balance", 0)
    new_balance = max(0, previous_balance + amount)  # Don't go below 0

    now = datetime.now(timezone.utc)

    # Update balance
    resident_ref.update({"balance": new_balance})

    # Log the override
    db.collection("credit_overrides").add({
        "resident_id": resident_id,
        "admin_id": admin_id,
        "previous_balance": previous_balance,
        "new_balance": new_balance,
        "amount": amount,
        "reason": reason,
        "timestamp": now,
    })

    # FCM notification
    try:
        send_notification(
            resident_id,
            "CREDIT_OVERRIDE",
            {"balance": str(new_balance)},
        )
    except Exception:
        pass

    return CreditOverrideResponse(
        resident_id=resident_id,
        previous_balance=previous_balance,
        new_balance=new_balance,
        amount_changed=amount,
        reason=reason,
        admin_id=admin_id,
        timestamp=now,
    )


def purchase_guest_pass(
    resident_id: str,
    site_id: str,
    meal_type: str = None,
) -> GuestPassResponse:
    """
    Issue a single-use guest QR pass.
    The guest pass is valid for 24 hours.
    """
    from datetime import timedelta

    db = get_db()
    now = datetime.now(timezone.utc)
    expiry = now + timedelta(hours=24)

    # Generate a unique guest QR payload
    guest_id = f"guest_{uuid.uuid4().hex[:12]}"
    qr_payload = generate_qr_payload(guest_id, site_id)
    qr_base64 = generate_qr_image_base64(qr_payload)

    # Store in Firestore
    doc_ref = db.collection("guest_passes").document(guest_id)
    doc_ref.set({
        "resident_id": resident_id,
        "site_id": site_id,
        "meal_type": meal_type,
        "qr_payload": qr_payload,
        "status": "UNUSED",
        "expiry_at": expiry,
        "created_at": now,
    })

    # FCM notification
    try:
        send_notification(resident_id, "GUEST_PASS_ISSUED", {})
    except Exception:
        pass

    return GuestPassResponse(
        id=guest_id,
        resident_id=resident_id,
        qr_payload=qr_payload,
        qr_base64=qr_base64,
        status="UNUSED",
        expiry_at=expiry,
        created_at=now,
    )
