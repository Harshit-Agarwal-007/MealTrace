# app/routes/admin.py
"""
Super Admin endpoints.

GET     /admin/residents              — Paginated resident list with filters
POST    /admin/residents              — Add individual resident
POST    /admin/residents/bulk         — CSV/Excel bulk import
PATCH   /admin/residents/:id          — Edit resident profile
DELETE  /admin/residents/:id          — Soft-delete, invalidates QR
POST    /admin/credit-override        — Manual credit add/deduct + reason
GET     /admin/reports/weekly         — Excel download — attendance report
GET     /admin/reports/monthly        — Monthly summary
GET     /admin/reports/financial      — Payment transaction log
GET     /admin/reports/exception      — Blocked scan log by date range
GET     /admin/dashboard/stats        — Live dashboard stats
GET     /admin/dashboard/scan-feed    — Recent scan activity feed
"""

import csv
import io
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse

from app.models.resident import (
    ResidentProfile,
    ResidentListResponse,
    CreateResidentRequest,
    UpdateResidentRequest,
)
from app.models.payment import CreditOverrideRequest, CreditOverrideResponse
from app.models.common import APIResponse
from app.middleware.auth import require_admin
from app.services.resident_service import (
    list_residents,
    create_resident,
    update_resident,
    delete_resident,
    bulk_import_residents,
)
from app.services.payment_service import credit_override
from app.services.report_service import (
    generate_weekly_report,
    generate_monthly_report,
    generate_financial_report,
    generate_exception_report,
)
from app.database import get_db

router = APIRouter(prefix="/admin", tags=["Admin"])


# ── Resident Management ──

@router.get("/residents", response_model=ResidentListResponse)
async def admin_list_residents(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status: ACTIVE, INACTIVE"),
    site_id: Optional[str] = Query(None, description="Filter by site"),
    search: Optional[str] = Query(None, description="Search by name or email"),
    current_user: dict = Depends(require_admin),
):
    """Paginated resident list with optional filters."""
    return list_residents(
        page=page,
        page_size=page_size,
        status_filter=status,
        site_filter=site_id,
        search=search,
    )


@router.post("/residents", response_model=ResidentProfile, status_code=201)
async def admin_add_resident(
    request: CreateResidentRequest,
    current_user: dict = Depends(require_admin),
):
    """Add an individual resident."""
    return create_resident(
        name=request.name,
        email=request.email,
        phone=request.phone,
        room_number=request.room_number,
        site_id=request.site_id,
    )


@router.post("/residents/bulk", response_model=APIResponse)
async def admin_bulk_import(
    file: UploadFile = File(..., description="CSV file with columns: name, email, phone, room_number, site_id"),
    current_user: dict = Depends(require_admin),
):
    """
    Bulk import residents from a CSV file.

    CSV format:
    ```
    name,email,phone,room_number,site_id
    John Doe,john@example.com,+919876543210,A-101,site_north_001
    ```
    """
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="File must be a .csv")

    content = await file.read()
    text = content.decode("utf-8")

    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    if not rows:
        raise HTTPException(status_code=400, detail="CSV file is empty")

    result = bulk_import_residents(rows)

    return APIResponse(
        status="success",
        message=f"Imported {result['created']} residents. {len(result['errors'])} errors.",
        data=result,
    )


@router.patch("/residents/{resident_id}", response_model=ResidentProfile)
async def admin_edit_resident(
    resident_id: str,
    request: UpdateResidentRequest,
    current_user: dict = Depends(require_admin),
):
    """Edit a resident's profile (partial update)."""
    result = update_resident(resident_id, request.model_dump())
    if result is None:
        raise HTTPException(status_code=404, detail=f"Resident {resident_id} not found")
    return result


@router.delete("/residents/{resident_id}", response_model=APIResponse)
async def admin_delete_resident(
    resident_id: str,
    current_user: dict = Depends(require_admin),
):
    """
    Soft-delete a resident — sets status to INACTIVE and invalidates QR.
    The document is preserved for audit trail.
    """
    success = delete_resident(resident_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Resident {resident_id} not found")

    return APIResponse(
        status="success",
        message=f"Resident {resident_id} deactivated and QR invalidated.",
    )


# ── Credit Override ──

@router.post("/credit-override", response_model=CreditOverrideResponse)
async def admin_credit_override(
    request: CreditOverrideRequest,
    current_user: dict = Depends(require_admin),
):
    """
    Manually add or deduct credits for a resident.

    - Positive amount = add credits
    - Negative amount = deduct credits
    - Reason is logged for audit trail
    """
    admin_id = current_user["sub"]
    try:
        return credit_override(
            resident_id=request.resident_id,
            amount=request.amount,
            reason=request.reason,
            admin_id=admin_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# ── Reports ──

@router.get("/reports/weekly")
async def admin_weekly_report(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    current_user: dict = Depends(require_admin),
):
    """Download weekly attendance report as Excel file."""
    sd = None
    if start_date:
        sd = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)

    excel_bytes = generate_weekly_report(start_date=sd)

    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=weekly_attendance_report.xlsx"},
    )


@router.get("/reports/monthly")
async def admin_monthly_report(
    year: Optional[int] = Query(None),
    month: Optional[int] = Query(None, ge=1, le=12),
    current_user: dict = Depends(require_admin),
):
    """Download monthly summary report as Excel file."""
    excel_bytes = generate_monthly_report(year=year, month=month)

    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=monthly_summary_report.xlsx"},
    )


@router.get("/reports/financial")
async def admin_financial_report(
    current_user: dict = Depends(require_admin),
):
    """Download financial/payment transaction log as Excel file."""
    excel_bytes = generate_financial_report()

    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=financial_report.xlsx"},
    )


@router.get("/reports/exception")
async def admin_exception_report(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    current_user: dict = Depends(require_admin),
):
    """Download exception report (blocked scans) as Excel file by date range."""
    sd = None
    ed = None
    if start_date:
        sd = datetime.fromisoformat(start_date).replace(tzinfo=timezone.utc)
    if end_date:
        ed = datetime.fromisoformat(end_date).replace(tzinfo=timezone.utc)

    excel_bytes = generate_exception_report(start_date=sd, end_date=ed)

    return StreamingResponse(
        io.BytesIO(excel_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=exception_report.xlsx"},
    )


# ── Dashboard ──

@router.get("/dashboard/stats")
async def admin_dashboard_stats(
    current_user: dict = Depends(require_admin),
):
    """
    Live dashboard statistics.

    Returns: total residents, active residents, today's meal counts,
    total revenue, etc.
    """
    db = get_db()

    # Total residents
    all_residents = db.collection("residents").get()
    total_residents = len(all_residents)
    active_residents = sum(
        1 for d in all_residents if d.to_dict().get("status") == "ACTIVE"
    )

    # Today's scans
    from datetime import timedelta
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)

    today_scans = (
        db.collection("scan_logs")
        .where("timestamp", ">=", today_start)
        .where("timestamp", "<", today_end)
        .get()
    )

    total_scans_today = len(today_scans)
    successful_scans = sum(1 for d in today_scans if d.to_dict().get("status") == "SUCCESS")
    blocked_scans = total_scans_today - successful_scans

    # Meal breakdown
    meal_counts = {"BREAKFAST": 0, "LUNCH": 0, "DINNER": 0}
    for d in today_scans:
        data = d.to_dict()
        if data.get("status") == "SUCCESS":
            meal = data.get("meal_type", "")
            if meal in meal_counts:
                meal_counts[meal] += 1

    # Sites count
    sites = db.collection("sites").get()

    return {
        "total_residents": total_residents,
        "active_residents": active_residents,
        "today_total_scans": total_scans_today,
        "today_successful_scans": successful_scans,
        "today_blocked_scans": blocked_scans,
        "meal_counts": meal_counts,
        "total_sites": len(sites),
    }


@router.get("/dashboard/scan-feed")
async def admin_scan_feed(
    limit: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(require_admin),
):
    """
    Recent scan activity feed for the admin live dashboard.
    Returns the latest N scan log entries.
    """
    db = get_db()

    logs = (
        db.collection("scan_logs")
        .order_by("timestamp", direction="DESCENDING")
        .limit(limit)
        .get()
    )

    feed = []
    for doc in logs:
        data = doc.to_dict()

        # Fetch resident name
        resident_name = None
        rid = data.get("resident_id")
        if rid:
            rdoc = db.collection("residents").document(rid).get()
            if rdoc.exists:
                resident_name = rdoc.to_dict().get("name")

        feed.append({
            "id": doc.id,
            "resident_id": rid,
            "resident_name": resident_name,
            "site_id": data.get("site_id"),
            "meal_type": data.get("meal_type"),
            "status": data.get("status"),
            "block_reason": data.get("block_reason"),
            "timestamp": str(data.get("timestamp")),
        })

    return {"feed": feed, "count": len(feed)}
