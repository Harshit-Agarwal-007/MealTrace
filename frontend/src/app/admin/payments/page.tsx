"use client";

/**
 * Admin Payments Dashboard — MealTrace
 *
 * API endpoints used:
 *  GET  /admin/payments/summary        → Revenue KPI cards
 *  GET  /admin/payments?page=&status=  → Paginated transaction list
 *  POST /admin/credit-override         → Manual credit add/deduct
 *  GET  /admin/credit-overrides        → Credit override audit log
 *  GET  /admin/reports/financial       → Download Excel (wiring doc §5.6)
 *
 * Features:
 *  - Revenue KPI cards (total, plan, guest-pass, success/fail breakdown)
 *  - Status filter tabs (All / Success / Pending / Failed)
 *  - Paginated transaction table with Razorpay IDs
 *  - Credit Override form (positive = add, negative = deduct)
 *  - Credit override audit log
 *  - One-click financial report download
 */

import { useState, useEffect, useCallback } from "react";
import {
  IndianRupee, Download, RefreshCw, Loader2, AlertTriangle,
  TrendingUp, CreditCard, Gift, XCircle, CheckCircle2,
  Clock, ChevronLeft, ChevronRight, Plus, Minus, FileText,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { api, downloadBlob } from "@/lib/apiClient";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentSummary {
  total_revenue_inr: number;
  plan_revenue_inr: number;
  guest_pass_revenue_inr: number;
  success_count: number;
  pending_count: number;
  failed_count: number;
  total_transactions: number;
}

interface PaymentRecord {
  id: string;
  resident_id: string;
  resident_name?: string;
  plan_id?: string;
  razorpay_order_id: string;
  razorpay_payment_id?: string;
  amount: number; // paise
  status: "SUCCESS" | "PENDING" | "FAILED" | "UNKNOWN";
  is_guest_pass: boolean;
  timestamp: string;
}

interface CreditOverride {
  id: string;
  resident_id: string;
  admin_id: string;
  previous_balance: number;
  new_balance: number;
  amount: number;
  reason: string;
  timestamp: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(n);

function formatTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("en-IN", {
      day: "numeric", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon, color,
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div className={`bg-white rounded-2xl p-5 border shadow-sm shadow-slate-100 flex flex-col gap-2 ${color}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <div className="opacity-60">{icon}</div>
      </div>
      <p className="text-2xl font-black text-slate-800 leading-none">{value}</p>
      {sub && <p className="text-xs text-slate-400 font-medium">{sub}</p>}
    </div>
  );
}

const STATUS_STYLES: Record<string, string> = {
  SUCCESS: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-red-50 text-red-700 border-red-200",
  UNKNOWN: "bg-slate-50 text-slate-500 border-slate-200",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  SUCCESS: <CheckCircle2 className="w-3 h-3" />,
  PENDING: <Clock className="w-3 h-3" />,
  FAILED: <XCircle className="w-3 h-3" />,
};

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = "transactions" | "credit-overrides" | "credit-form";
type StatusFilter = "ALL" | "SUCCESS" | "PENDING" | "FAILED";

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState<Tab>("transactions");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");

  // ── Summary ────────────────────────────────────────────────────────────────
  const [summary, setSummary] = useState<PaymentSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // ── Transactions ───────────────────────────────────────────────────────────
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalPayments, setTotalPayments] = useState(0);
  const PAGE_SIZE = 20;

  // ── Credit overrides ───────────────────────────────────────────────────────
  const [overrides, setOverrides] = useState<CreditOverride[]>([]);
  const [overridesLoading, setOverridesLoading] = useState(false);

  // ── Credit override form ───────────────────────────────────────────────────
  const [crForm, setCrForm] = useState({ resident_id: "", amount: "", reason: "" });
  const [crLoading, setCrLoading] = useState(false);
  const [crMsg, setCrMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // ── Excel download ─────────────────────────────────────────────────────────
  const [downloading, setDownloading] = useState(false);

  // ── Fetch summary ──────────────────────────────────────────────────────────
  useEffect(() => {
    setSummaryLoading(true);
    api.get<PaymentSummary>("/admin/payments/summary")
      .then(setSummary)
      .catch(() => {})
      .finally(() => setSummaryLoading(false));
  }, []);

  // ── Fetch payments ─────────────────────────────────────────────────────────
  const fetchPayments = useCallback(async (p: number, filter: StatusFilter) => {
    setPaymentsLoading(true);
    try {
      const qs = filter === "ALL"
        ? `/admin/payments?page=${p}&page_size=${PAGE_SIZE}`
        : `/admin/payments?page=${p}&page_size=${PAGE_SIZE}&status=${filter}`;
      const data = await api.get<{ payments: PaymentRecord[]; total: number; has_more: boolean }>(qs);
      setPayments(data.payments ?? []);
      setTotalPayments(data.total ?? 0);
      setHasMore(data.has_more ?? false);
    } catch {
      setPayments([]);
    } finally {
      setPaymentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "transactions") fetchPayments(page, statusFilter);
  }, [tab, page, statusFilter, fetchPayments]);

  // ── Fetch credit overrides ─────────────────────────────────────────────────
  useEffect(() => {
    if (tab !== "credit-overrides") return;
    setOverridesLoading(true);
    api.get<{ overrides: CreditOverride[] }>("/admin/credit-overrides?page_size=50")
      .then((d) => setOverrides(d.overrides ?? []))
      .catch(() => {})
      .finally(() => setOverridesLoading(false));
  }, [tab]);

  // ── Submit credit override ─────────────────────────────────────────────────
  const submitCreditOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseInt(crForm.amount, 10);
    if (isNaN(amt) || amt === 0) {
      setCrMsg({ ok: false, text: "Amount must be a non-zero number." });
      return;
    }
    setCrLoading(true);
    setCrMsg(null);
    try {
      const result = await api.post<any>("/admin/credit-override", {
        resident_id: crForm.resident_id.trim(),
        amount: amt,
        reason: crForm.reason.trim(),
      });
      setCrMsg({
        ok: true,
        text: `Done! Balance: ${result.previous_balance} → ${result.new_balance}`,
      });
      setCrForm({ resident_id: "", amount: "", reason: "" });
    } catch (err) {
      setCrMsg({ ok: false, text: err instanceof Error ? err.message : "Failed." });
    } finally {
      setCrLoading(false);
    }
  };

  // ── Download report ────────────────────────────────────────────────────────
  const downloadReport = async () => {
    setDownloading(true);
    try {
      const blob = await api.get<Blob>("/admin/reports/financial", { returnBlob: true } as any);
      downloadBlob(blob, "mealtrace_financial_report.xlsx");
    } catch {
      alert("Failed to download report. Try again.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-5 pt-6 pb-28 space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="p-2 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
            <ArrowLeft className="w-4 h-4 text-slate-600" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-slate-900">Payments</h1>
            <p className="text-xs text-slate-400 font-medium mt-0.5">Revenue, transactions & credits</p>
          </div>
        </div>
        <button
          onClick={downloadReport}
          disabled={downloading}
          className="flex items-center gap-2 bg-indigo-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-indigo-600/25 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-60"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export Excel
        </button>
      </div>

      {/* KPI Cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl h-24 border border-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            label="Total Revenue"
            value={fmt(summary?.total_revenue_inr ?? 0)}
            sub={`${summary?.success_count ?? 0} successful transactions`}
            icon={<TrendingUp className="w-5 h-5 text-emerald-500" />}
            color="border-emerald-100"
          />
          <KpiCard
            label="Plan Revenue"
            value={fmt(summary?.plan_revenue_inr ?? 0)}
            sub="From meal plan purchases"
            icon={<CreditCard className="w-5 h-5 text-blue-500" />}
            color="border-blue-100"
          />
          <KpiCard
            label="Guest Pass Revenue"
            value={fmt(summary?.guest_pass_revenue_inr ?? 0)}
            sub="₹100 per guest pass"
            icon={<Gift className="w-5 h-5 text-purple-500" />}
            color="border-purple-100"
          />
          <KpiCard
            label="Failed / Pending"
            value={`${summary?.failed_count ?? 0} / ${summary?.pending_count ?? 0}`}
            sub={`of ${summary?.total_transactions ?? 0} total`}
            icon={<AlertTriangle className="w-5 h-5 text-red-400" />}
            color="border-red-100"
          />
        </div>
      )}

      {/* Tab selector */}
      <div className="flex bg-slate-100 rounded-2xl p-1 gap-1">
        {(
          [
            { key: "transactions", label: "Transactions" },
            { key: "credit-overrides", label: "Credit Overrides" },
            { key: "credit-form", label: "Adjust Credits" },
          ] as { key: Tab; label: string }[]
        ).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
              tab === key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Transactions tab ──────────────────────────────────────────────────── */}
      {tab === "transactions" && (
        <div className="space-y-4">
          {/* Status filter */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(["ALL", "SUCCESS", "PENDING", "FAILED"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`shrink-0 text-[11px] font-bold px-4 py-2 rounded-full border transition-all ${
                  statusFilter === s
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Count label */}
          <p className="text-xs text-slate-400 font-medium">{totalPayments} transactions</p>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
            {paymentsLoading && Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 flex gap-3 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-32" />
                  <div className="h-2.5 bg-slate-200 rounded w-48" />
                </div>
                <div className="h-5 w-16 bg-slate-200 rounded-lg" />
              </div>
            ))}

            {!paymentsLoading && payments.length === 0 && (
              <div className="p-10 text-center text-slate-400">
                <IndianRupee className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">No transactions found</p>
              </div>
            )}

            {!paymentsLoading && payments.map((p) => (
              <div key={p.id} className="p-4 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${STATUS_STYLES[p.status] ?? STATUS_STYLES.UNKNOWN}`}>
                      {STATUS_ICON[p.status]}
                      {p.status}
                    </span>
                    {p.is_guest_pass && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                        <Gift className="w-3 h-3" /> Guest Pass
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-slate-800 truncate">
                    {p.resident_name ?? p.resident_id ?? "—"}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate">
                    {p.razorpay_payment_id ?? p.razorpay_order_id}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{formatTime(p.timestamp)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-base font-black ${p.status === "SUCCESS" ? "text-emerald-600" : "text-slate-400"}`}>
                    {fmt(p.amount / 100)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {!paymentsLoading && totalPayments > PAGE_SIZE && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || paymentsLoading}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <p className="text-xs text-slate-400 font-medium">
                Page {page} · {totalPayments} total
              </p>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore || paymentsLoading}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-600 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Credit Overrides audit log ─────────────────────────────────────── */}
      {tab === "credit-overrides" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500 font-medium">Manual credit adjustments log</p>
            <button
              onClick={() => {
                setOverridesLoading(true);
                api.get<{ overrides: CreditOverride[] }>("/admin/credit-overrides?page_size=50")
                  .then((d) => setOverrides(d.overrides ?? []))
                  .catch(() => {})
                  .finally(() => setOverridesLoading(false));
              }}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-50">
            {overridesLoading && Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-4 flex gap-3 animate-pulse">
                <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded w-36" />
                  <div className="h-2.5 bg-slate-200 rounded w-48" />
                </div>
              </div>
            ))}

            {!overridesLoading && overrides.length === 0 && (
              <div className="p-10 text-center text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-semibold">No overrides recorded yet</p>
              </div>
            )}

            {!overridesLoading && overrides.map((o) => (
              <div key={o.id} className="p-4 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
                  o.amount > 0 ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                }`}>
                  {o.amount > 0 ? <Plus className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{o.resident_id}</p>
                  <p className="text-xs text-slate-500 mt-0.5">"{o.reason}"</p>
                  <p className="text-[10px] text-slate-400 mt-1">{formatTime(o.timestamp)}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-black ${o.amount > 0 ? "text-emerald-600" : "text-red-500"}`}>
                    {o.amount > 0 ? "+" : ""}{o.amount} credits
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-mono">
                    {o.previous_balance} → {o.new_balance}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Credit Override form ───────────────────────────────────────────── */}
      {tab === "credit-form" && (
        <form onSubmit={submitCreditOverride} className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-4 py-3 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              Use positive numbers to <strong>add</strong> credits, negative to <strong>deduct</strong>.
              All overrides are logged with your admin ID for audit.
            </span>
          </div>

          <div className="space-y-4">
            {/* Resident ID */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 block">Resident ID</label>
              <input
                id="cr-resident-id"
                type="text"
                required
                value={crForm.resident_id}
                onChange={(e) => setCrForm((f) => ({ ...f, resident_id: e.target.value }))}
                placeholder="e.g. res_abc123"
                className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-mono"
              />
              <p className="text-[11px] text-slate-400">Find this in the Residents page</p>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 block">Credit Amount</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-slate-400 font-bold text-sm">#</span>
                </div>
                <input
                  id="cr-amount"
                  type="number"
                  required
                  value={crForm.amount}
                  onChange={(e) => setCrForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="+10 or -3"
                  className="pl-8 w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
              <div className="flex gap-2 mt-2">
                {[5, 10, 15, 30].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCrForm((f) => ({ ...f, amount: String(n) }))}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    +{n}
                  </button>
                ))}
                {[-1, -5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setCrForm((f) => ({ ...f, amount: String(n) }))}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors"
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 block">Reason (audit trail)</label>
              <textarea
                id="cr-reason"
                required
                minLength={5}
                value={crForm.reason}
                onChange={(e) => setCrForm((f) => ({ ...f, reason: e.target.value }))}
                placeholder="e.g. Refund for missed meal due to kitchen closure"
                rows={3}
                className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm text-slate-900 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
              />
            </div>
          </div>

          {/* Feedback */}
          {crMsg && (
            <div className={`flex items-start gap-2.5 p-3.5 rounded-xl border text-sm font-medium ${
              crMsg.ok
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}>
              {crMsg.ok ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
              {crMsg.text}
            </div>
          )}

          <button
            id="cr-submit"
            type="submit"
            disabled={crLoading}
            className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 shadow-md shadow-indigo-600/25 hover:bg-indigo-700 active:scale-[0.98] transition-all"
          >
            {crLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
            {crLoading ? "Applying..." : "Apply Credit Override"}
          </button>
        </form>
      )}
    </div>
  );
}
