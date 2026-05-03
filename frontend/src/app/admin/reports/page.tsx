"use client";

import { useState } from "react";
import { ArrowLeft, Download, FileSpreadsheet, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { api, downloadBlob } from "@/lib/apiClient";

function todayISO(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function firstOfMonthISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function AdminReports() {
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [weeklyStart, setWeeklyStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [monthYear, setMonthYear] = useState(() => new Date().getFullYear());
  const [monthNum, setMonthNum] = useState(() => new Date().getMonth() + 1);
  const [excStart, setExcStart] = useState(firstOfMonthISO);
  const [excEnd, setExcEnd] = useState(todayISO);
  const [scanStart, setScanStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [scanEnd, setScanEnd] = useState(todayISO);
  const [scanSiteId, setScanSiteId] = useState("");

  const runDownload = async (key: string, path: string, filename: string) => {
    setErr(null);
    setBusy(key);
    try {
      const blob = await api.get<Blob>(path, { returnBlob: true });
      downloadBlob(blob, filename);
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Download failed");
    } finally {
      setBusy(null);
    }
  };

  const cards = [
    {
      key: "weekly",
      title: "Weekly attendance",
      desc: "Successful scans aggregated by day, resident, and meal slot.",
      fmt: "XLSX",
      extra: (
        <label className="mt-2 block text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Week starting (UTC date)
          <input
            type="date"
            value={weeklyStart}
            onChange={(e) => setWeeklyStart(e.target.value)}
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800"
          />
        </label>
      ),
      onDownload: () =>
        runDownload(
          "weekly",
          `/admin/reports/weekly?start_date=${encodeURIComponent(weeklyStart)}`,
          `weekly_attendance_${weeklyStart}.xlsx`
        ),
    },
    {
      key: "monthly",
      title: "Monthly summary",
      desc: "Per-resident meal totals and average meals per day for a calendar month.",
      fmt: "XLSX",
      extra: (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Year
            <input
              type="number"
              min={2020}
              max={2100}
              value={monthYear}
              onChange={(e) => setMonthYear(parseInt(e.target.value, 10) || new Date().getFullYear())}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
            />
          </label>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Month
            <select
              value={monthNum}
              onChange={(e) => setMonthNum(parseInt(e.target.value, 10))}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>
      ),
      onDownload: () =>
        runDownload(
          "monthly",
          `/admin/reports/monthly?year=${monthYear}&month=${monthNum}`,
          `monthly_summary_${monthYear}-${String(monthNum).padStart(2, "0")}.xlsx`
        ),
    },
    {
      key: "financial",
      title: "Financial / payments",
      desc: "Razorpay orders and payment rows from the payments collection.",
      fmt: "XLSX",
      extra: null,
      onDownload: () => runDownload("financial", "/admin/reports/financial", "financial_report.xlsx"),
    },
    {
      key: "residents",
      title: "Residents roster",
      desc: "All resident profiles (IDs, contact, site, balance, plan).",
      fmt: "XLSX",
      extra: null,
      onDownload: () => runDownload("residents", "/admin/reports/residents", "residents_roster.xlsx"),
    },
    {
      key: "exception",
      title: "Blocked scans (exceptions)",
      desc: "Failed validations with block reason — same underlying data as live feeds, wider window.",
      fmt: "XLSX",
      extra: (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            From
            <input
              type="date"
              value={excStart}
              onChange={(e) => setExcStart(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold"
            />
          </label>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            To
            <input
              type="date"
              value={excEnd}
              onChange={(e) => setExcEnd(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold"
            />
          </label>
        </div>
      ),
      onDownload: () =>
        runDownload(
          "exception",
          `/admin/reports/exception?start_date=${encodeURIComponent(excStart)}&end_date=${encodeURIComponent(excEnd)}`,
          `exception_report_${excStart}_${excEnd}.xlsx`
        ),
    },
    {
      key: "scans",
      title: "Scan activity (full log)",
      desc: "Every scan row in the window (success and blocked). Use this for audits; the dashboard feed shows only the latest scans.",
      fmt: "XLSX",
      extra: (
        <div className="mt-2 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              From
              <input
                type="date"
                value={scanStart}
                onChange={(e) => setScanStart(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold"
              />
            </label>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              To
              <input
                type="date"
                value={scanEnd}
                onChange={(e) => setScanEnd(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold"
              />
            </label>
          </div>
          <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Site ID (optional)
            <input
              type="text"
              value={scanSiteId}
              onChange={(e) => setScanSiteId(e.target.value.trim())}
              placeholder="Leave empty for all sites"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold"
            />
          </label>
        </div>
      ),
      onDownload: () => {
        const q = new URLSearchParams({
          start_date: scanStart,
          end_date: scanEnd,
        });
        if (scanSiteId) q.set("site_id", scanSiteId);
        return runDownload("scans", `/admin/reports/scans?${q.toString()}`, `scan_activity_${scanStart}_${scanEnd}.xlsx`);
      },
    },
  ];

  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500 space-y-6 pb-24 max-w-lg mx-auto">
      <Link
        href="/admin"
        className="inline-flex items-center text-blue-600 font-bold hover:text-blue-700 transition-colors mb-2"
      >
        <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">System reports</h1>
      <p className="text-slate-500 text-sm mb-2">
        Downloads call the MealTrace API with your admin session. Live scan feeds stay small for performance; full history
        lives in Firestore and is exported here.
      </p>

      {err && (
        <div className="flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          {err}
        </div>
      )}

      <div className="grid gap-4">
        {cards.map((report) => (
          <div
            key={report.key}
            className="flex flex-col rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{report.title}</h3>
                  <p className="mt-1 text-xs font-medium text-slate-500">{report.desc}</p>
                  <span className="mt-2 inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                    {report.fmt}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={report.onDownload}
                disabled={busy !== null}
                className="shrink-0 rounded-full bg-slate-50 p-2.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                aria-label={`Download ${report.title}`}
              >
                {busy === report.key ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
              </button>
            </div>
            {report.extra}
          </div>
        ))}
      </div>
    </div>
  );
}
