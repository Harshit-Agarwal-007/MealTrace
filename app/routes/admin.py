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
from pydantic import BaseModel

from app.models.resident import (
    ResidentProfile,
    ResidentListResponse,
    CreateResidentRequest,
    UpdateResidentRequest,
    TransactionListResponse,
    SubscribeRequest,
    SubscriptionInfo,
)
from app.models.vendor import (
    VendorProfile,
    VendorListResponse,
    CreateVendorRequest,
    UpdateVendorRequest,
)
from app.models.payment import (
    CreditOverrideRequest,
    CreditOverrideResponse,
    PlanInfo,
    CreatePlanRequest,
    UpdatePlanRequest,
)
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
    get_transactions,
    subscribe_to_plan,
    get_subscription,
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


# ═══════════════════════════════════════
# RESIDENT TRANSACTIONS (Admin View)
# ═══════════════════════════════════════

@router.get("/residents/{resident_id}/transactions", response_model=TransactionListResponse)
async def admin_resident_transactions(
    resident_id: str,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(require_admin),
):
    """
    Get a specific resident's scan/transaction history (admin view).
    Used when admin clicks on a resident to see their activity.
    """
    return get_transactions(resident_id, page=page, page_size=page_size)


@router.post("/residents/{resident_id}/subscribe", response_model=SubscriptionInfo)
async def admin_subscribe_resident(
    resident_id: str,
    request: SubscribeRequest,
    current_user: dict = Depends(require_admin),
):
    """
    Admin subscribes a resident to a meal plan with selected meals.

    Useful when PG owner manages subscriptions on behalf of residents.
    """
    try:
        return subscribe_to_plan(resident_id, request.plan_id, request.selected_meals)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


# ═══════════════════════════════════════
# PLAN CRUD (Admin)
# ═══════════════════════════════════════

@router.get("/plans", response_model=list[PlanInfo])
async def admin_list_plans(
    current_user: dict = Depends(require_admin),
):
    """List all plans (including inactive ones, unlike the public /plans endpoint)."""
    db = get_db()
    docs = db.collection("plans").get()

    plans = []
    for doc in docs:
        data = doc.to_dict()
        plans.append(PlanInfo(
            id=doc.id,
            name=data.get("name", ""),
            meals_per_day=data.get("meals_per_day", 1),
            meal_count=data.get("meal_count", 0),
            duration_days=data.get("duration_days", 30),
            price=data.get("price", 0),
            description=data.get("description"),
            is_active=data.get("is_active", True),
        ))

    return plans


@router.post("/plans", response_model=PlanInfo, status_code=201)
async def admin_create_plan(
    request: CreatePlanRequest,
    current_user: dict = Depends(require_admin),
):
    """Create a new meal plan."""
    import uuid as _uuid

    if request.meals_per_day not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="meals_per_day must be 1, 2, or 3")

    db = get_db()
    plan_id = f"plan_{_uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc)

    doc_data = {
        "name": request.name,
        "meals_per_day": request.meals_per_day,
        "meal_count": request.meal_count,
        "duration_days": request.duration_days,
        "price": request.price,
        "description": request.description,
        "is_active": True,
        "created_at": now,
    }

    db.collection("plans").document(plan_id).set(doc_data)

    return PlanInfo(id=plan_id, **doc_data)


@router.patch("/plans/{plan_id}", response_model=PlanInfo)
async def admin_update_plan(
    plan_id: str,
    request: UpdatePlanRequest,
    current_user: dict = Depends(require_admin),
):
    """Update a meal plan (partial update)."""
    db = get_db()
    doc_ref = db.collection("plans").document(plan_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Plan {plan_id} not found")

    clean_updates = {k: v for k, v in request.model_dump().items() if v is not None}

    if "meals_per_day" in clean_updates and clean_updates["meals_per_day"] not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="meals_per_day must be 1, 2, or 3")

    if clean_updates:
        doc_ref.update(clean_updates)

    # Return updated plan
    updated = doc_ref.get().to_dict()
    return PlanInfo(
        id=plan_id,
        name=updated.get("name", ""),
        meals_per_day=updated.get("meals_per_day", 1),
        meal_count=updated.get("meal_count", 0),
        duration_days=updated.get("duration_days", 30),
        price=updated.get("price", 0),
        description=updated.get("description"),
        is_active=updated.get("is_active", True),
    )


@router.delete("/plans/{plan_id}", response_model=APIResponse)
async def admin_delete_plan(
    plan_id: str,
    current_user: dict = Depends(require_admin),
):
    """
    Soft-delete a plan — sets is_active to False.
    Does NOT remove the plan (existing subscriptions may reference it).
    """
    db = get_db()
    doc_ref = db.collection("plans").document(plan_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail=f"Plan {plan_id} not found")

    doc_ref.update({"is_active": False})

    return APIResponse(
        status="success",
        message=f"Plan {plan_id} deactivated.",
    )


# ═══════════════════════════════════════
# CREDIT OVERRIDES AUDIT LOG
# ═══════════════════════════════════════

@router.get("/credit-overrides")
async def admin_credit_overrides_log(
    resident_id: Optional[str] = Query(None, description="Filter by resident"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    current_user: dict = Depends(require_admin),
):
    """
    Audit log of all manual credit overrides.
    Shows who changed what, when, and why.
    """
    db = get_db()

    query = db.collection("credit_overrides")
    if resident_id:
        query = query.where("resident_id", "==", resident_id)

    all_docs = query.get()

    # Sort by timestamp descending (client-side)
    sorted_docs = sorted(
        all_docs,
        key=lambda d: d.to_dict().get("timestamp", datetime.min.replace(tzinfo=timezone.utc)),
        reverse=True,
    )

    total = len(sorted_docs)
    offset = (page - 1) * page_size
    page_docs = sorted_docs[offset: offset + page_size]

    overrides = []
    for doc in page_docs:
        data = doc.to_dict()
        overrides.append({
            "id": doc.id,
            "resident_id": data.get("resident_id"),
            "admin_id": data.get("admin_id"),
            "previous_balance": data.get("previous_balance"),
            "new_balance": data.get("new_balance"),
            "amount": data.get("amount"),
            "reason": data.get("reason"),
            "timestamp": str(data.get("timestamp")),
        })

    return {
        "overrides": overrides,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (offset + page_size) < total,
    }


# ═══════════════════════════════════════
# PAYMENTS (Admin view)
# ═══════════════════════════════════════

@router.get("/payments")
async def admin_list_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by status: SUCCESS, PENDING, FAILED"),
    resident_id: Optional[str] = Query(None, description="Filter by resident"),
    current_user: dict = Depends(require_admin),
):
    """
    Paginated list of Razorpay payment transactions.

    Returns payment records with resident name enrichment.
    Used by the admin Payments dashboard to show transaction history,
    revenue totals, and per-plan breakdowns.
    """
    db = get_db()

    query = db.collection("payments")
    if status:
        query = query.where("status", "==", status)
    if resident_id:
        query = query.where("resident_id", "==", resident_id)

    all_docs = list(query.get())

    # Sort by timestamp descending
    sorted_docs = sorted(
        all_docs,
        key=lambda d: d.to_dict().get("timestamp", datetime.min.replace(tzinfo=timezone.utc)),
        reverse=True,
    )

    total = len(sorted_docs)
    offset = (page - 1) * page_size
    page_docs = sorted_docs[offset: offset + page_size]

    # Cache resident names
    resident_cache = {}
    records = []
    for doc in page_docs:
        data = doc.to_dict()
        rid = data.get("resident_id", "")

        if rid and rid not in resident_cache:
            rdoc = db.collection("residents").document(rid).get()
            resident_cache[rid] = rdoc.to_dict().get("name") if rdoc.exists else None

        records.append({
            "id": doc.id,
            "resident_id": rid,
            "resident_name": resident_cache.get(rid),
            "plan_id": data.get("plan_id"),
            "razorpay_order_id": data.get("razorpay_order_id", ""),
            "razorpay_payment_id": data.get("razorpay_payment_id"),
            "amount": data.get("amount", 0),  # in paise
            "status": data.get("status", "UNKNOWN"),
            "is_guest_pass": data.get("is_guest_pass", False),
            "timestamp": str(data.get("timestamp", "")),
        })

    return {
        "payments": records,
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": (offset + page_size) < total,
    }


@router.get("/payments/summary")
async def admin_payments_summary(
    current_user: dict = Depends(require_admin),
):
    """
    Revenue summary for the payments dashboard.
    Returns total revenue, successful payments, guest pass revenue,
    and plan revenue — all from the payments Firestore collection.
    """
    db = get_db()
    all_docs = list(db.collection("payments").get())

    total_revenue = 0
    plan_revenue = 0
    guest_pass_revenue = 0
    success_count = 0
    pending_count = 0
    failed_count = 0

    for doc in all_docs:
        data = doc.to_dict()
        status = data.get("status", "")
        amount = data.get("amount", 0)  # paise

        if status == "SUCCESS":
            success_count += 1
            total_revenue += amount
            if data.get("is_guest_pass"):
                guest_pass_revenue += amount
            else:
                plan_revenue += amount
        elif status == "PENDING":
            pending_count += 1
        elif status == "FAILED":
            failed_count += 1

    return {
        "total_revenue_paise": total_revenue,
        "total_revenue_inr": total_revenue / 100,
        "plan_revenue_inr": plan_revenue / 100,
        "guest_pass_revenue_inr": guest_pass_revenue / 100,
        "success_count": success_count,
        "pending_count": pending_count,
        "failed_count": failed_count,
        "total_transactions": len(all_docs),
    }




# ═══════════════════════════════════════
# BROADCAST NOTIFICATION
# ═══════════════════════════════════════

class BroadcastRequest(BaseModel):
    title: str
    message: str
    site_id: Optional[str] = None  # If None, broadcast to all residents



@router.post("/notifications/broadcast", response_model=APIResponse)
async def admin_broadcast_notification(
    request: BroadcastRequest,
    current_user: dict = Depends(require_admin),
):
    """
    Broadcast a push notification to all residents at a site (or all sites).
    Example: 'Dinner delayed by 30 minutes at North Wing'.
    """
    from app.utils.fcm_manager import send_notification

    db = get_db()

    # Get target residents
    query = db.collection("residents").where("status", "==", "ACTIVE")
    if request.site_id:
        query = query.where("site_id", "==", request.site_id)

    residents = query.get()
    sent_count = 0
    failed_count = 0

    for doc in residents:
        try:
            send_notification(
                doc.id,
                "ADMIN_BROADCAST",
                {"title": request.title, "message": request.message},
            )
            sent_count += 1
        except Exception:
            failed_count += 1

    return APIResponse(
        status="success",
        message=f"Notification sent to {sent_count} residents. {failed_count} failed.",
        data={"sent": sent_count, "failed": failed_count, "total": len(residents)},
    )
