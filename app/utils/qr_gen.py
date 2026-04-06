# app/utils/qr_gen.py
"""
Cryptographically signed QR code generation and verification.

QR Payload Format:
    {resident_uuid}:{site_id}:{timestamp}:{hmac_signature}

The HMAC-SHA256 signature prevents forgery — only the backend that knows
the signing secret can generate valid QR payloads.
"""

import hmac
import hashlib
import base64
import io
import json
from datetime import datetime, timezone

import qrcode
from qrcode.image.pil import PilImage

from app.config import get_settings


def _compute_signature(data: str) -> str:
    """Compute HMAC-SHA256 over the data string."""
    settings = get_settings()
    return hmac.new(
        settings.QR_SIGNING_SECRET.encode("utf-8"),
        data.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def generate_qr_payload(resident_id: str, site_id: str) -> str:
    """
    Create a signed QR payload string.

    Format: base64(json({resident_id, site_id, ts, sig}))
    """
    ts = datetime.now(timezone.utc).isoformat()
    data_to_sign = f"{resident_id}:{site_id}:{ts}"
    signature = _compute_signature(data_to_sign)

    payload_obj = {
        "rid": resident_id,
        "sid": site_id,
        "ts": ts,
        "sig": signature,
    }
    payload_json = json.dumps(payload_obj, separators=(",", ":"))
    return base64.urlsafe_b64encode(payload_json.encode("utf-8")).decode("utf-8")


def verify_qr_payload(payload_b64: str) -> dict:
    """
    Verify a QR payload's HMAC signature.

    Returns:
        {
            "valid": True/False,
            "resident_id": "...",
            "site_id": "...",
            "timestamp": "...",
        }
    """
    try:
        payload_json = base64.urlsafe_b64decode(payload_b64.encode("utf-8")).decode("utf-8")
        payload = json.loads(payload_json)

        resident_id = payload["rid"]
        site_id = payload["sid"]
        ts = payload["ts"]
        provided_sig = payload["sig"]

        # Recompute and compare
        data_to_sign = f"{resident_id}:{site_id}:{ts}"
        expected_sig = _compute_signature(data_to_sign)

        is_valid = hmac.compare_digest(provided_sig, expected_sig)

        return {
            "valid": is_valid,
            "resident_id": resident_id,
            "site_id": site_id,
            "timestamp": ts,
        }
    except Exception:
        return {"valid": False, "resident_id": None, "site_id": None, "timestamp": None}


def generate_qr_image_base64(payload: str) -> str:
    """
    Generate a QR code image from the payload string and return as base64 PNG.
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(payload)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return base64.b64encode(buffer.getvalue()).decode("utf-8")
