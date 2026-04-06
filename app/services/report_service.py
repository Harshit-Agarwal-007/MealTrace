# app/services/report_service.py
"""
Report generation service — Excel exports for admin dashboard.

Report Types:
  1. Weekly Attendance Report
  2. Monthly Aggregated Summary
  3. Financial / Payment Transaction Log
  4. Exception Report (blocked scans by date range)
"""

import io
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import openpyxl
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

from app.database import get_db

logger = logging.getLogger(__name__)

# Styling constants
HEADER_FONT = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
HEADER_FILL = PatternFill(start_color="2E86AB", end_color="2E86AB", fill_type="solid")
HEADER_ALIGNMENT = Alignment(horizontal="center", vertical="center")
THIN_BORDER = Border(
    left=Side(style="thin"),
    right=Side(style="thin"),
    top=Side(style="thin"),
    bottom=Side(style="thin"),
)


def _style_header(ws, headers: list):
    """Apply consistent header styling."""
    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.font = HEADER_FONT
        cell.fill = HEADER_FILL
        cell.alignment = HEADER_ALIGNMENT
        cell.border = THIN_BORDER
        ws.column_dimensions[cell.column_letter].width = max(15, len(header) + 5)


def generate_weekly_report(start_date: Optional[datetime] = None) -> bytes:
    """
    Weekly attendance report — shows daily scan counts per resident per site.

    Columns: Date | Resident | Site | Breakfast | Lunch | Dinner | Total
    """
    db = get_db()

    if start_date is None:
        start_date = datetime.now(timezone.utc) - timedelta(days=7)

    end_date = start_date + timedelta(days=7)

    # Fetch scan logs for the period
    logs = (
        db.collection("scan_logs")
        .where("status", "==", "SUCCESS")
        .where("timestamp", ">=", start_date)
        .where("timestamp", "<=", end_date)
        .get()
    )

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Weekly Attendance"

    headers = ["Date", "Resident ID", "Resident Name", "Site", "Breakfast", "Lunch", "Dinner", "Total Meals"]
    _style_header(ws, headers)

    # Aggregate by date + resident
    daily_data = {}
    for doc in logs:
        data = doc.to_dict()
        ts = data.get("timestamp")
        if hasattr(ts, "date"):
            day = ts.date().isoformat()
        else:
            day = str(ts)[:10]

        key = (day, data.get("resident_id", ""))
        if key not in daily_data:
            daily_data[key] = {"breakfast": 0, "lunch": 0, "dinner": 0, "site": data.get("site_id", "")}

        meal = data.get("meal_type", "").lower()
        if meal in daily_data[key]:
            daily_data[key][meal] += 1

    # Fetch resident names
    resident_names = {}
    for (day, rid), counts in daily_data.items():
        if rid not in resident_names:
            rdoc = db.collection("residents").document(rid).get()
            resident_names[rid] = rdoc.to_dict().get("name", rid) if rdoc.exists else rid

    row = 2
    for (day, rid), counts in sorted(daily_data.items()):
        total = counts["breakfast"] + counts["lunch"] + counts["dinner"]
        ws.cell(row=row, column=1, value=day)
        ws.cell(row=row, column=2, value=rid)
        ws.cell(row=row, column=3, value=resident_names.get(rid, rid))
        ws.cell(row=row, column=4, value=counts["site"])
        ws.cell(row=row, column=5, value=counts["breakfast"])
        ws.cell(row=row, column=6, value=counts["lunch"])
        ws.cell(row=row, column=7, value=counts["dinner"])
        ws.cell(row=row, column=8, value=total)
        row += 1

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()


def generate_monthly_report(year: int = None, month: int = None) -> bytes:
    """
    Monthly aggregated summary.

    Columns: Resident | Site | Total Meals | Avg Per Day | Balance Remaining
    """
    db = get_db()
    now = datetime.now(timezone.utc)

    if year is None:
        year = now.year
    if month is None:
        month = now.month

    start_date = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)

    days_in_month = (end_date - start_date).days

    logs = (
        db.collection("scan_logs")
        .where("status", "==", "SUCCESS")
        .where("timestamp", ">=", start_date)
        .where("timestamp", "<", end_date)
        .get()
    )

    # Aggregate by resident
    resident_totals = {}
    for doc in logs:
        data = doc.to_dict()
        rid = data.get("resident_id", "")
        if rid not in resident_totals:
            resident_totals[rid] = {"total": 0, "site": data.get("site_id", "")}
        resident_totals[rid]["total"] += 1

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Monthly Summary"

    headers = ["Resident ID", "Resident Name", "Site", "Total Meals", "Avg/Day", "Balance Remaining"]
    _style_header(ws, headers)

    row = 2
    for rid, counts in sorted(resident_totals.items()):
        rdoc = db.collection("residents").document(rid).get()
        rdata = rdoc.to_dict() if rdoc.exists else {}

        avg = round(counts["total"] / max(1, days_in_month), 1)
        ws.cell(row=row, column=1, value=rid)
        ws.cell(row=row, column=2, value=rdata.get("name", rid))
        ws.cell(row=row, column=3, value=counts["site"])
        ws.cell(row=row, column=4, value=counts["total"])
        ws.cell(row=row, column=5, value=avg)
        ws.cell(row=row, column=6, value=rdata.get("balance", 0))
        row += 1

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()


def generate_financial_report() -> bytes:
    """
    Financial / payment transaction log.

    Columns: Date | Resident | Plan | Amount | Status | Razorpay ID
    """
    db = get_db()

    payments = (
        db.collection("payments")
        .order_by("timestamp", direction="DESCENDING")
        .get()
    )

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Financial Report"

    headers = ["Date", "Resident ID", "Plan", "Amount (₹)", "Status", "Razorpay Order ID", "Payment ID"]
    _style_header(ws, headers)

    row = 2
    for doc in payments:
        data = doc.to_dict()
        ts = data.get("timestamp")
        ws.cell(row=row, column=1, value=str(ts)[:19] if ts else "")
        ws.cell(row=row, column=2, value=data.get("resident_id", ""))
        ws.cell(row=row, column=3, value=data.get("plan_id", ""))
        ws.cell(row=row, column=4, value=data.get("amount", 0))
        ws.cell(row=row, column=5, value=data.get("status", ""))
        ws.cell(row=row, column=6, value=data.get("razorpay_order_id", ""))
        ws.cell(row=row, column=7, value=data.get("razorpay_payment_id", ""))
        row += 1

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()


def generate_exception_report(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> bytes:
    """
    Exception report — all blocked/failed scans in a date range.

    Columns: Date | Resident | Site | Meal | Block Reason | Vendor
    """
    db = get_db()

    if start_date is None:
        start_date = datetime.now(timezone.utc) - timedelta(days=30)
    if end_date is None:
        end_date = datetime.now(timezone.utc)

    logs = (
        db.collection("scan_logs")
        .where("status", "==", "BLOCKED")
        .where("timestamp", ">=", start_date)
        .where("timestamp", "<=", end_date)
        .order_by("timestamp", direction="DESCENDING")
        .get()
    )

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Exception Report"

    headers = ["Date/Time", "Resident ID", "Site", "Meal Type", "Block Reason", "Vendor ID"]
    _style_header(ws, headers)

    row = 2
    for doc in logs:
        data = doc.to_dict()
        ts = data.get("timestamp")
        ws.cell(row=row, column=1, value=str(ts)[:19] if ts else "")
        ws.cell(row=row, column=2, value=data.get("resident_id", ""))
        ws.cell(row=row, column=3, value=data.get("site_id", ""))
        ws.cell(row=row, column=4, value=data.get("meal_type", ""))
        ws.cell(row=row, column=5, value=data.get("block_reason", ""))
        ws.cell(row=row, column=6, value=data.get("vendor_id", ""))
        row += 1

    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    return buffer.getvalue()
