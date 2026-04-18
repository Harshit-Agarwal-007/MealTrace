"use client";

/**
 * Admin Dashboard — wiring doc §5.1
 *
 * GET /admin/dashboard/stats     → KPI cards
 * GET /admin/dashboard/scan-feed?limit=50 → live feed table
 *
 * Refresh strategy (wiring doc §5.1 note — no WebSocket in Tier 1):
 *   Auto-poll every 15s + manual refresh button.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { UserPlus, Activity, Database, AlertCircle, LogOut, RefreshCw, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/apiClient";
import type { DashboardStats, ScanFeedEntry } from "@/lib/types";

const POLL_INTERVAL_MS = 15_000;

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className={`bg-white rounded-[24px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100`}>
      <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${color}`}>{label}</p>
      <p className="text-3xl font-black text-slate-800">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function FeedRow({ scan }: { scan: ScanFeedEntry }) {
  const timeLabel = (() => {
    try {
      const d = new Date(scan.timestamp);
      const diff = Math.floor((Date.now() - d.getTime()) / 60000);
      if (diff < 1) return "Just now";
      if (diff < 60) return `${diff}m ago`;
      return `${Math.floor(diff / 60)}h ago`;
    } catch { return "—"; }
  })();

  return (
    <div className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
      <div>
        <h3 className="font-bold text-slate-900 text-sm">{scan.resident_name ?? "Unknown"}</h3>
        <p className="text-slate-500 text-xs">
          {scan.site_id ?? "—"} · {scan.meal_type ?? "—"}
          {scan.is_guest_pass ? " · Guest Pass" : ""}
        </p>
      </div>
      <div className="text-right">
        {scan.status === "SUCCESS" ? (
          <span className="text-emerald-600 font-bold text-[10px] uppercase bg-emerald-50 px-2 py-1 rounded-md">
            Success
          </span>
        ) : (
          <span className="text-red-600 font-bold text-[10px] uppercase bg-red-50 px-2 py-1 rounded-md">
            {scan.block_reason?.replaceAll("_", " ") ?? "Blocked"}
          </span>
        )}
        <p className="text-slate-400 text-[10px] mt-1">{timeLabel}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [feed, setFeed] = useState<ScanFeedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[] | null>(null);
  const [searching, setSearching] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [statsData, feedData] = await Promise.all([
        api.get<DashboardStats>("/admin/dashboard/stats"),
        api.get<{ feed: ScanFeedEntry[]; count: number }>("/admin/dashboard/scan-feed?limit=50"),
      ]);
      setStats(statsData);
      setFeed(feedData.feed ?? []);
      setLastUpdated(new Date());
    } catch {
      // silently ignore poll errors
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    pollRef.current = setInterval(() => fetchData(true), POLL_INTERVAL_MS);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchData]);

  // ── Global search debounce ────────────────────────────────────────────────
  useEffect(() => {
    if (!search.trim()) { setSearchResults(null); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await api.get<any>(`/admin/search?q=${encodeURIComponent(search.trim())}`);
        setSearchResults([
          ...data.residents.map((r: any) => ({ ...r, _type: "Resident" })),
          ...data.vendors.map((v: any) => ({ ...v, _type: "Vendor" })),
          ...data.sites.map((s: any) => ({ ...s, _type: "Site" })),
        ]);
      } catch {
        setSearchResults([]);
      } finally { setSearching(false); }
    }, 500);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500 space-y-6 pb-24">

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">
            Admin Dashboard
          </h1>
          <p className="text-slate-500 font-medium text-sm mt-1">
            {lastUpdated
              ? `Updated at ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
              : "Live metrics and operations"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData()}
            disabled={refreshing}
            className="p-2.5 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
          >
            {refreshing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
          </button>
          <button
            onClick={logout}
            className="p-2.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Global Search */}
      <div className="relative">
        <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          id="admin-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Global Search (Residents, Sites, Vendors)..."
          className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-medium shadow-sm"
        />
        {searching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500 animate-spin" />}

        {/* Search dropdown */}
        {searchResults !== null && (
          <div className="absolute top-full left-0 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-64 overflow-y-auto">
            {searchResults.length === 0 ? (
              <p className="p-4 text-center text-sm text-slate-400">No results found.</p>
            ) : (
              searchResults.map((r, i) => (
                <div key={i} className="p-3 flex items-center gap-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer">
                  <span className={`text-[10px] font-black px-2 py-1 rounded-full uppercase ${
                    r._type === "Resident" ? "bg-blue-50 text-blue-600" :
                    r._type === "Vendor" ? "bg-amber-50 text-amber-600" :
                    "bg-emerald-50 text-emerald-600"
                  }`}>{r._type}</span>
                  <span className="text-sm font-semibold text-slate-800">{r.name}</span>
                  {r.email && <span className="text-xs text-slate-400">{r.email}</span>}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-[24px] p-5 h-24 border border-slate-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Scans Today"
            value={stats?.today_total_scans ?? 0}
            sub={`${stats?.today_successful_scans ?? 0} successful · ${stats?.today_blocked_scans ?? 0} blocked`}
            color="text-blue-600"
          />
          <StatCard
            label="Active Residents"
            value={stats?.active_residents ?? 0}
            sub={`of ${stats?.total_residents ?? 0} total`}
            color="text-indigo-600"
          />
          <StatCard
            label="Breakfast / Lunch / Dinner"
            value={`${stats?.meal_counts?.BREAKFAST ?? 0} / ${stats?.meal_counts?.LUNCH ?? 0} / ${stats?.meal_counts?.DINNER ?? 0}`}
            color="text-purple-600"
          />
          <StatCard
            label="Active Vendors"
            value={stats?.active_vendors ?? 0}
            sub={`across ${stats?.total_sites ?? 0} sites`}
            color="text-emerald-600"
          />
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { href: "/admin/residents", color: "blue", Icon: UserPlus, label: "Users" },
          { href: "/admin/vendors", color: "amber", Icon: AlertCircle, label: "Vendors" },
          { href: "/admin/plans", color: "purple", Icon: Database, label: "Plans" },
          { href: "/admin/sites", color: "emerald", Icon: Activity, label: "Sites" },
          { href: "/admin/reports", color: "rose", Icon: LogOut, label: "Reports" },
        ].map(({ href, color, Icon, label }) => (
          <Link key={href} href={href} className={`bg-${color}-50 text-${color}-700 p-4 rounded-[20px] flex flex-col items-center gap-2 border border-${color}-100 hover:bg-${color}-100 transition-colors shadow-sm text-center`}>
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-bold uppercase leading-tight">{label}</span>
          </Link>
        ))}
      </div>

      {/* Live Scan Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
            Live Scan Feed
          </h2>
          <span className="text-xs text-slate-400 font-medium">Auto-refreshes every 15s</span>
        </div>

        <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden divide-y divide-slate-50">
          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 flex gap-3 animate-pulse">
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-slate-200 rounded w-28" />
                <div className="h-2.5 bg-slate-200 rounded w-20" />
              </div>
              <div className="h-5 w-14 bg-slate-200 rounded" />
            </div>
          ))}
          {!loading && feed.length === 0 && (
            <p className="p-8 text-center text-slate-400 text-sm">No scans recorded yet today.</p>
          )}
          {!loading && feed.map((scan) => (
            <FeedRow key={scan.id} scan={scan} />
          ))}
        </div>
      </div>

      {/* Broadcast shortcut */}
      <Link
        href="/admin/broadcast"
        className="w-full flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4 rounded-2xl shadow-lg shadow-blue-600/20 hover:-translate-y-0.5 transition-all active:scale-[0.98]"
      >
        <span className="font-bold text-sm">Send Push Notification</span>
        <Activity className="w-5 h-5 opacity-80" />
      </Link>
    </div>
  );
}
