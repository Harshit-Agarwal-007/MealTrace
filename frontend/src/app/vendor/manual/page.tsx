"use client";

/**
 * Vendor Manual Entry — wiring doc §4.4
 *
 * Search:  GET /vendor/search-user?query=<min 3 chars>
 * Commit:  POST /scan/manual  { resident_id, site_id, vendor_id, description }
 *
 * Debounced search with 400ms delay prevents excessive API calls.
 */

import { useState, useEffect, useCallback } from "react";
import { Search, CheckCircle2, User, Loader2, AlertTriangle, XCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/apiClient";
import type { SearchResult, ScanValidateResponse } from "@/lib/types";

export default function VendorManualEntry() {
  const { userId } = useAuth();
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ScanValidateResponse | null>(null);

  const siteId = typeof window !== "undefined" ? localStorage.getItem("vendorSiteId") ?? "" : "";

  // ── Debounced search ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (query.trim().length >= 3) {
      setIsSearching(true);
      setShowDropdown(true);
      const timer = setTimeout(async () => {
        try {
          const data = await api.get<{ results: SearchResult[]; count: number }>(
            `/vendor/search-user?query=${encodeURIComponent(query.trim())}`
          );
          setSearchResults(data.results ?? []);
        } catch {
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [query]);

  const handleSelect = (user: SearchResult) => {
    setSelectedUser(user);
    setQuery("");
    setShowDropdown(false);
    setResult(null);
  };

  // ── Commit manual scan ───────────────────────────────────────────────────────
  const handleDeduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    setResult(null);
    try {
      // wiring doc §4.4 body
      const data = await api.post<ScanValidateResponse>("/scan/manual", {
        resident_id: selectedUser.id,
        site_id: siteId,
        vendor_id: userId, // JWT sub
        description: "Forgot phone",
      });
      setResult(data);
      if (data.status === "SUCCESS") {
        // Reset after success
        setTimeout(() => {
          setSelectedUser(null);
          setResult(null);
        }, 3000);
      }
    } catch (err) {
      setResult({
        status: "BLOCKED",
        block_reason: err instanceof Error ? err.message : "Manual scan failed.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 pt-12 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold mb-2">Manual Entry</h1>
      <p className="text-neutral-400 mb-8 font-medium">
        Search resident by phone or name to deduct manually. (Min 3 chars)
      </p>

      {/* Search */}
      <div className="mb-8 relative z-50">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
          <input
            id="manual-search"
            type="text"
            placeholder="Enter phone or name..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-neutral-800/80 border-2 border-neutral-700/50 rounded-[24px] py-4 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500 transition-colors placeholder:text-neutral-500 font-semibold shadow-inner"
          />
          {isSearching && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500 animate-spin" />
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 w-full mt-2 bg-neutral-800 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto z-50">
            {!isSearching && searchResults.length === 0 ? (
              <div className="p-4 text-center text-neutral-500 text-sm">No residents found.</div>
            ) : (
              searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user)}
                  className="w-full p-4 flex items-center gap-4 text-left hover:bg-neutral-700/50 transition-colors border-b border-neutral-700/30 last:border-0"
                >
                  <div className="bg-neutral-900 p-2 rounded-full shrink-0">
                    <User className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-white font-bold">{user.name}</div>
                    <div className="text-neutral-400 text-xs mt-0.5">
                      {user.phone ?? "—"} • Room {user.room_number ?? "—"}
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
          className="bg-neutral-800/60 backdrop-blur-md rounded-[32px] p-6 border border-neutral-700/50 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300 relative z-0"
        >
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">{selectedUser.name}</h2>
              <p className="text-neutral-400 text-sm mt-1">
                {selectedUser.phone ?? "—"} • Room {selectedUser.room_number ?? "—"}
              </p>
              <div className="flex gap-2 mt-3 flex-wrap">
                {selectedUser.plan_name && (
                  <span className="bg-neutral-900 border border-neutral-700 text-amber-500 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                    {selectedUser.plan_name}
                  </span>
                )}
                {selectedUser.dietary_preference && (
                  <span className="bg-neutral-900 border border-neutral-700 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">
                    {selectedUser.dietary_preference}
                  </span>
                )}
              </div>
            </div>
            <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-700 text-center shadow-inner shrink-0 ml-4">
              <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">Balance</p>
              <p className="text-white text-3xl font-black">{selectedUser.balance ?? "—"}</p>
            </div>
          </div>

          {/* Scan result feedback */}
          {result && (
            <div className={`mb-4 flex items-center gap-3 p-4 rounded-2xl border ${
              result.status === "SUCCESS"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                : "bg-red-500/10 border-red-500/30 text-red-400"
            }`}>
              {result.status === "SUCCESS" ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 shrink-0" />
              )}
              <div className="text-sm font-bold">
                {result.status === "SUCCESS"
                  ? `Meal deducted! Balance: ${result.balance_after}`
                  : result.block_reason?.replaceAll("_", " ") ?? "Scan failed"}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || result?.status === "SUCCESS"}
            className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-neutral-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50 shadow-lg shadow-amber-500/20"
          >
            {submitting ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-5 h-5 mb-0.5" />
            )}
            {submitting ? "Processing..." : "Deduct 1 Meal"}
          </button>
        </form>
      )}
    </div>
  );
}
