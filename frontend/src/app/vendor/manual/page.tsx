"use client";

/**
 * Vendor Manual Entry — wiring doc §4.4
 *
 * Search:  GET /vendor/search-user?query=&site_id= (min 2 chars)
 * Commit:  POST /scan/manual  { resident_id, site_id, vendor_id, description }
 */

import { useState, useEffect } from "react";
import { Search, CheckCircle2, User, Loader2, AlertTriangle, XCircle, MapPin } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/apiClient";
import type { SearchResult, ScanValidateResponse } from "@/lib/types";

type AssignedSite = { id: string; name: string };

export default function VendorManualEntry() {
  const { userId } = useAuth();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ScanValidateResponse | null>(null);
  const [sites, setSites] = useState<AssignedSite[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [selectedSiteId, setSelectedSiteId] = useState("");

  useEffect(() => {
    setSitesLoading(true);
    api
      .get<{ sites: { id: string; name: string }[] }>("/vendor/assigned-sites")
      .then((data) => {
        const list = (data.sites ?? []).map((s) => ({ id: s.id, name: s.name || s.id }));
        setSites(list);
        const stored = typeof window !== "undefined" ? localStorage.getItem("vendorSiteId")?.trim() : "";
        const initial =
          stored && list.some((s) => s.id === stored) ? stored : list[0]?.id ?? "";
        setSelectedSiteId(initial);
      })
      .catch(() => {
        setSites([]);
        setSelectedSiteId("");
      })
      .finally(() => setSitesLoading(false));
  }, []);

  // ── Debounced search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedSiteId || query.trim().length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }
    setIsSearching(true);
    setShowDropdown(true);
    const timer = setTimeout(async () => {
      try {
        const q = encodeURIComponent(query.trim());
        const sid = encodeURIComponent(selectedSiteId);
        const data = await api.get<{ results: SearchResult[]; count: number }>(
          `/vendor/search-user?query=${q}&site_id=${sid}`
        );
        setSearchResults(data.results ?? []);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, selectedSiteId]);

  const handleSelect = (user: SearchResult) => {
    setSelectedUser(user);
    setQuery("");
    setShowDropdown(false);
    setResult(null);
  };

  // ── Commit manual scan ───────────────────────────────────────────────────────
  const handleDeduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedSiteId) return;
    setSubmitting(true);
    setResult(null);
    try {
      const data = await api.post<ScanValidateResponse>("/scan/manual", {
        resident_id: selectedUser.id,
        site_id: selectedSiteId,
        vendor_id: userId,
        description: "Forgot phone",
      });
      setResult(data);
      if (data.status === "SUCCESS") {
        setTimeout(() => {
          setSelectedUser(null);
          setResult(null);
        }, 3000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Manual scan failed.";
      const isNetwork = /failed to fetch|networkerror|load failed/i.test(msg);
      const base =
        typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
          ? process.env.NEXT_PUBLIC_API_URL
          : "http://localhost:8000";
      setResult({
        status: "BLOCKED",
        block_reason: isNetwork
          ? `Failed to reach API (${base}). Check backend is running and NEXT_PUBLIC_API_URL is correct.`
          : msg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 pt-12 animate-in fade-in duration-500">
      <h1 className="mb-2 text-3xl font-bold">Manual Entry</h1>
      <p className="mb-6 font-medium text-neutral-400">
        Pick the site, then search by phone, name, room, or email (min 2 characters).
      </p>

      {/* Site */}
      <div className="mb-6">
        <label className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-500/90">
          <MapPin className="h-4 w-4" />
          Site for this deduction
        </label>
        <select
          value={selectedSiteId}
          onChange={(e) => setSelectedSiteId(e.target.value)}
          disabled={sitesLoading || sites.length === 0}
          className="w-full rounded-[20px] border-2 border-neutral-700/50 bg-neutral-800/80 py-3.5 pl-4 pr-4 font-bold text-white shadow-inner focus:border-amber-500 focus:outline-none disabled:opacity-50"
        >
          {sitesLoading ? (
            <option value="">Loading sites…</option>
          ) : sites.length === 0 ? (
            <option value="">No sites assigned</option>
          ) : (
            sites.map((s) => (
              <option key={s.id} value={s.id} className="bg-neutral-900">
                {s.name}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Search */}
      <div className="relative z-50 mb-8">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-neutral-500" />
          <input
            id="manual-search"
            type="text"
            placeholder="Phone, name, room, or email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={!selectedSiteId}
            className="w-full rounded-[24px] border-2 border-neutral-700/50 bg-neutral-800/80 py-4 pl-12 pr-4 font-semibold text-white shadow-inner transition-colors placeholder:text-neutral-500 focus:border-amber-500 focus:outline-none disabled:opacity-50"
          />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 animate-spin text-amber-500" />
          )}
        </div>

        {showDropdown && selectedSiteId && (
          <div className="absolute left-0 top-full z-50 mt-2 max-h-72 w-full overflow-y-auto overflow-x-hidden rounded-2xl border border-neutral-700 bg-neutral-800 shadow-2xl">
            {!isSearching && searchResults.length === 0 ? (
              <div className="p-4 text-center text-sm text-neutral-500">No residents found.</div>
            ) : (
              searchResults.map((user) => (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => handleSelect(user)}
                  className="flex w-full items-center gap-4 border-b border-neutral-700/30 p-4 text-left transition-colors last:border-0 hover:bg-neutral-700/50"
                >
                  <div className="shrink-0 rounded-full bg-neutral-900 p-2">
                    <User className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-white">{user.name}</div>
                    <div className="mt-0.5 text-xs text-neutral-400">
                      {user.phone ?? "—"} • Room {user.room_number ?? "—"}
                      {user.site_name ? ` • ${user.site_name}` : ""}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected user card */}
      {selectedUser && (
        <form
          onSubmit={handleDeduct}
          className="relative z-0 animate-in fade-in slide-in-from-bottom-4 rounded-[32px] border border-neutral-700/50 bg-neutral-800/60 p-6 shadow-2xl backdrop-blur-md duration-300"
        >
          <div className="mb-6 flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">{selectedUser.name}</h2>
              <p className="mt-1 text-sm text-neutral-400">
                {selectedUser.phone ?? "—"} • Room {selectedUser.room_number ?? "—"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {selectedUser.site_name ? (
                  <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-sky-400">
                    {selectedUser.site_name}
                  </span>
                ) : null}
                {selectedUser.plan_name && (
                  <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-500">
                    {selectedUser.plan_name}
                  </span>
                )}
                {selectedUser.dietary_preference && (
                  <span className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400">
                    {selectedUser.dietary_preference}
                  </span>
                )}
              </div>
            </div>
            <div className="ml-4 shrink-0 rounded-2xl border border-neutral-700 bg-neutral-900 p-4 text-center shadow-inner">
              <p className="mb-1 text-xs font-bold uppercase tracking-widest text-neutral-500">Balance</p>
              <p className="text-3xl font-black text-white">{selectedUser.balance ?? "—"}</p>
            </div>
          </div>

          {result && (
            <div
              className={`mb-4 flex items-center gap-3 rounded-2xl border p-4 ${
                result.status === "SUCCESS"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              {result.status === "SUCCESS" ? (
                <CheckCircle2 className="h-5 w-5 shrink-0" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0" />
              )}
              <div className="text-sm font-bold">
                {result.status === "SUCCESS"
                  ? `Meal deducted! Balance: ${result.balance_after}`
                  : result.block_reason?.replaceAll("_", " ") ?? "Scan failed"}
              </div>
            </div>
          )}

          {!selectedSiteId ? (
            <div className="mb-4 flex gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-semibold text-amber-200">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              Select a site above before deducting.
            </div>
          ) : null}

          <button
            type="submit"
            disabled={submitting || result?.status === "SUCCESS" || !selectedSiteId}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 py-4 font-black text-neutral-950 shadow-lg shadow-amber-500/20 transition-transform active:scale-95 disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="mb-0.5 h-5 w-5" />
            )}
            {submitting ? "Processing..." : "Deduct 1 Meal"}
          </button>
        </form>
      )}
    </div>
  );
}
