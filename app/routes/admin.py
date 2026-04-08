# app/routes/admin.py
"""
Super Admin endpoints.

── Resident Management ──
GET     /admin/residents              — Paginated resident list with filters
GET     /admin/residents/:id          — Get single resident detail
POST    /admin/residents              — Add individual resident
POST    /admin/residents/bulk         — CSV/Excel bulk import
PATCH   /admin/residents/:id          — Edit resident profile
DELETE  /admin/residents/:id          — Soft-delete, invalidates QR

── Vendor Management ──
GET     /admin/vendors                — Paginated vendor list with search
GET     /admin/vendors/:id            — Get single vendor detail
POST    /admin/vendors                — Create new vendor (with Firebase Auth)
PATCH   /admin/vendors/:id            — Update vendor profile
DELETE  /admin/vendors/:id            — Deactivate vendor

── Site Users ──
GET     /admin/sites/:id/residents    — All residents assigned to a site
GET     /admin/sites/:id/live-scans   — Recent scans at a site

── Search ──
GET     /admin/search                 — Unified search across residents, vendors, sites

── Credits ──
POST    /admin/credit-override        — Manual credit add/deduct + reason

── Reports ──
GET     /admin/reports/weekly         — Excel — attendance
GET     /admin/reports/monthly        — Monthly summary
GET     /admin/reports/financial      — Payment transaction log
GET     /admin/reports/exception      — Blocked scan log by date range

── Dashboard ──
GET     /admin/dashboard/stats        — Live dashboard stats
GET     /admin/dashboard/scan-feed    — Recent scan activity feed
"""

import csv
import io
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse

from app.models.resident import (
    ResidentProfile,
    ResidentListResponse,
    CreateResidentRequest,
    UpdateResidentRequest,
)
from app.models.vendor import (
    VendorProfile,
    VendorListResponse,
    CreateVendorRequest,
    UpdateVendorRequest,
)
from app.models.payment import CreditOverrideRequest, CreditOverrideResponse
from app.models.common import APIResponse
from app.middleware.auth import require_admin
from app.services.resident_service import (
    list_residents,
    get_profile as get_resident_profile,
    create_resident,
    update_resident,
    delete_resident,
    bulk_import_residents,
    get_residents_by_site,
)
from app.services.vendor_service import (
    create_vendor,
    list_vendors,
    get_vendor,
    update_vendor,
    delete_vendor as deactivate_vendor,
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


# ═══════════════════════════════════════
# RESIDENT MANAGEMENT
# ═══════════════════════════════════════

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


@router.get("/residents/{resident_id}", response_model=ResidentProfile)
async def admin_get_resident(
    resident_id: str,
    current_user: dict = Depends(require_admin),
):
    """Get a single resident's full profile (for click-through detail view)."""
    profile = get_resident_profile(resident_id)
    if profile is None:
        raise HTTPException(status_code=404, detail=f"Resident {resident_id} not found")
    return profile


@router.post("/residents", response_model=ResidentProfile, status_code=201)
async def admin_add_resident(
    request: CreateResidentRequest,
    current_user: dict = Depends(require_admin),
):
    """
    Add an individual resident.
    Also creates a Firebase Auth account so the user can login.
    If no password provided, sends a password setup email.
    """
    return create_resident(
        name=request.name,
        email=request.email,
        phone=request.phone,
        room_number=request.room_number,
        site_id=request.site_id,
        password=request.password,
    )


@router.post("/residents/bulk", response_model=APIResponse)
async def admin_bulk_import(
    file: UploadFile = File(..., description="CSV file with columns: name, email, phone, room_number, site_id"),
    current_user: dict = Depends(require_admin),
):
    """
    Bulk import residents from a CSV file.
    Also creates Firebase Auth accounts for each user.
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


# ═══════════════════════════════════════
# VENDOR MANAGEMENT
# ═══════════════════════════════════════

@router.get("/vendors", response_model=VendorListResponse)
async def admin_list_vendors(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search by name or email"),
    site_id: Optional[str] = Query(None, description="Filter by assigned site"),
    current_user: dict = Depends(require_admin),
):
    """List vendors with optional search and site filter."""
    return list_vendors(page=page, page_size=page_size, search=search, site_id=site_id)


@router.get("/vendors/{vendor_id}", response_model=VendorProfile)
async def admin_get_vendor(
    vendor_id: str,
    current_user: dict = Depends(require_admin),
):
    """Get a single vendor's profile."""
    vendor = get_vendor(vendor_id)
    if vendor is None:
        raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")
    return vendor


@router.post("/vendors", response_model=VendorProfile, status_code=201)
async def admin_create_vendor(
    request: CreateVendorRequest,
    current_user: dict = Depends(require_admin),
):
    """
    Create a new vendor.
    Creates a Firebase Auth account so the vendor can login.
    Optionally assigns them to sites.
    """
    try:
        return create_vendor(
            name=request.name,
            email=request.email,
            password=request.password,
            phone=request.phone,
            assigned_site_ids=request.assigned_site_ids,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/vendors/{vendor_id}", response_model=VendorProfile)
async def admin_update_vendor(
    vendor_id: str,
    request: UpdateVendorRequest,
    current_user: dict = Depends(require_admin),
):
    """Update a vendor's profile (partial update)."""
    result = update_vendor(vendor_id, request.model_dump())
    if result is None:
        raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")
    return result


@router.delete("/vendors/{vendor_id}", response_model=APIResponse)
async def admin_delete_vendor(
    vendor_id: str,
    current_user: dict = Depends(require_admin),
):
    """
    Soft-delete a vendor — sets status to INACTIVE.
    Removes vendor from all assigned sites.
    """
    success = deactivate_vendor(vendor_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Vendor {vendor_id} not found")

    return APIResponse(
        status="success",
        message=f"Vendor {vendor_id} deactivated and removed from sites.",
    )


# ═══════════════════════════════════════
# SITE USERS & LIVE VIEWS
# ═══════════════════════════════════════

@router.get("/sites/{site_id}/residents", response_model=list[ResidentProfile])
async def admin_site_residents(
    site_id: str,
    current_user: dict = Depends(require_admin),
):
    """Get all residents assigned to a specific site."""
    return get_residents_by_site(site_id)


@router.get("/sites/{site_id}/live-scans")
async def admin_site_live_scans(
    site_id: str,
    hours: int = Query(3, ge=1, le=24, description="Look back N hours"),
    current_user: dict = Depends(require_admin),
):
    """
    Recent scans at a specific site.
    Shows who has been eating at this site within the last N hours.
    Admin can click on a user to navigate to their CRUD page.
    """
    db = get_db()
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

    scans = (
        db.collection("scan_logs")
        .where("site_id", "==", site_id)
        .where("timestamp", ">=", cutoff)
        .order_by("timestamp", direction="DESCENDING")
        .get()
    )

    results = []
    seen_residents = set()
    for doc in scans:
        data = doc.to_dict()
        rid = data.get("resident_id")

        # Fetch resident details (deduplicate)
        resident_info = None
        if rid and rid not in seen_residents:
            rdoc = db.collection("residents").document(rid).get()
            if rdoc.exists:
                rdata = rdoc.to_dict()
                resident_info = {
                    "id": rid,
                    "name": rdata.get("name"),
                    "email": rdata.get("email"),
                    "room_number": rdata.get("room_number"),
                    "balance": rdata.get("balance"),
                    "plan_id": rdata.get("plan_id"),
                    "allowed_meals": rdata.get("allowed_meals", []),
                }
            seen_residents.add(rid)

        results.append({
            "scan_id": doc.id,
            "resident_id": rid,
            "resident_info": resident_info,
            "meal_type": data.get("meal_type"),
            "status": data.get("status"),
            "block_reason": data.get("block_reason"),
            "is_guest_pass": data.get("is_guest_pass", False),
            "timestamp": str(data.get("timestamp")),
        })

    return {"scans": results, "count": len(results), "site_id": site_id}


# ═══════════════════════════════════════
# UNIFIED SEARCH
# ═══════════════════════════════════════

@router.get("/search")
async def admin_search(
    q: str = Query(..., min_length=1, description="Search query"),
    current_user: dict = Depends(require_admin),
):
    """
    Unified search across residents, vendors, and sites.
    Returns matching results from each category.
    """
    db = get_db()
    q_lower = q.lower()

    # Search residents
    residents = []
    for doc in db.collection("residents").get():
        data = doc.to_dict()
        if (q_lower in data.get("name", "").lower()
            or q_lower in data.get("email", "").lower()
            or q_lower in doc.id.lower()):
            residents.append({
                "id": doc.id,
                "name": data.get("name"),
                "email": data.get("email"),
                "type": "resident",
                "status": data.get("status"),
                "site_id": data.get("site_id"),
                "balance": data.get("balance"),
            })

    # Search vendors
    vendors = []
    for doc in db.collection("admin_users").where("role", "==", "VENDOR").get():
        data = doc.to_dict()
        if (q_lower in data.get("name", "").lower()
            or q_lower in data.get("email", "").lower()
            or q_lower in doc.id.lower()):
            vendors.append({
                "id": doc.id,
                "name": data.get("name"),
                "email": data.get("email"),
                "type": "vendor",
                "status": data.get("status"),
                "assigned_site_ids": data.get("assigned_site_ids", []),
            })

    # Search sites
    sites = []
    for doc in db.collection("sites").get():
        data = doc.to_dict()
        if (q_lower in data.get("name", "").lower()
            or q_lower in doc.id.lower()):
            sites.append({
                "id": doc.id,
                "name": data.get("name"),
                "type": "site",
                "is_active": data.get("is_active", True),
            })

    return {
        "query": q,
        "residents": residents,
        "vendors": vendors,
        "sites": sites,
        "total": len(residents) + len(vendors) + len(sites),
    }


# ═══════════════════════════════════════
# CREDIT OVERRIDE
# ═══════════════════════════════════════

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


# ═══════════════════════════════════════
# REPORTS
# ═══════════════════════════════════════

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


# ═══════════════════════════════════════
# DASHBOARD
# ═══════════════════════════════════════

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

    # Total vendors
    all_vendors = list(
        db.collection("admin_users").where("role", "==", "VENDOR").get()
    )
    total_vendors = len(all_vendors)
    active_vendors = sum(
        1 for d in all_vendors if d.to_dict().get("status", "ACTIVE") == "ACTIVE"
    )

    # Today's scans
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
    guest_pass_scans = sum(1 for d in today_scans if d.to_dict().get("is_guest_pass"))

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
        "total_vendors": total_vendors,
        "active_vendors": active_vendors,
        "today_total_scans": total_scans_today,
        "today_successful_scans": successful_scans,
        "today_blocked_scans": blocked_scans,
        "today_guest_pass_scans": guest_pass_scans,
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
    resident_cache = {}
    for doc in logs:
        data = doc.to_dict()

        # Fetch resident name (cached)
        resident_name = None
        rid = data.get("resident_id")
        if rid:
            if rid not in resident_cache:
                rdoc = db.collection("residents").document(rid).get()
                resident_cache[rid] = rdoc.to_dict().get("name") if rdoc.exists else None
            resident_name = resident_cache[rid]

        feed.append({
            "id": doc.id,
            "resident_id": rid,
            "resident_name": resident_name,
            "site_id": data.get("site_id"),
            "meal_type": data.get("meal_type"),
            "status": data.get("status"),
            "block_reason": data.get("block_reason"),
            "is_guest_pass": data.get("is_guest_pass", False),
            "timestamp": str(data.get("timestamp")),
        })

    return {"feed": feed, "count": len(feed)}
