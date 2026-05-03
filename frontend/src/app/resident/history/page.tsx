"use client";

/**
 * Resident History — wiring doc §3.3
 *
 * GET /resident/transactions?page=1&page_size=20
 * Increment page until transactions.length < page_size or API returns empty.
 *
 * Maps: timestamp, meal_type, site_id/site_name, status, block_reason
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/apiClient";
import type { TransactionListResponse, Transaction } from "@/lib/types";
import { Utensils, CheckCircle2, XCircle, RefreshCw, Loader2 } from "lucide-react";

const PAGE_SIZE = 20;

function mealLabel(raw: string | undefined | null): string {
  if (!raw?.trim()) return "Meal window";
  const u = raw.toUpperCase();
  if (u === "BREAKFAST") return "Breakfast";
  if (u === "LUNCH") return "Lunch";
  if (u === "DINNER") return "Dinner";
  return raw.replaceAll("_", " ");
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Skeleton() {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 animate-pulse">
      <div className="w-11 h-11 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="h-3 bg-gray-200 rounded w-40" />
      </div>
      <div className="h-6 w-14 bg-gray-200 rounded-lg" />
    </div>
  );
}

export default function ResidentHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPage = useCallback(async (pageNum: number, append = false) => {
    if (!append) setLoading(true);
    else setLoadingMore(true);
    setError(null);

    try {
      const data = await api.get<TransactionListResponse>(
        `/resident/transactions?page=${pageNum}&page_size=${PAGE_SIZE}`
      );
      const incoming = data.transactions ?? [];
      setTransactions((prev) => (append ? [...prev, ...incoming] : incoming));
      setHasMore(incoming.length >= PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load history.");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    fetchPage(1);
  }, [fetchPage]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchPage(next, true);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6 flex items-center justify-between text-slate-900">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">History</h1>
          <p className="text-sm text-slate-600">Your recent meal scans</p>
        </div>
        <button
          type="button"
          onClick={() => fetchPage(1)}
          className="rounded-full border border-slate-200/80 bg-white/90 p-2.5 shadow-sm transition-colors hover:bg-slate-50"
          aria-label="Refresh history"
        >
          <RefreshCw className="h-4 w-4 text-slate-600" />
        </button>
      </div>

      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-gray-200/50 border border-gray-100 space-y-3">
        {/* Loading skeletons */}
        {loading && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} />)}

        {/* Error state */}
        {error && !loading && (
          <div className="text-center py-8 text-red-500 text-sm">
            {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && transactions.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <Utensils className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-semibold">No transactions yet</p>
            <p className="text-xs mt-1">Your meal scan history will appear here</p>
          </div>
        )}

        {/* Transaction rows */}
        {!loading && transactions.map((tx) => (
          <div
            key={tx.id}
            className="flex flex-row items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full shrink-0 ${
                tx.status === "SUCCESS"
                  ? "bg-emerald-100 text-emerald-600"
                  : "bg-red-100 text-red-600"
              } shadow-sm`}>
                <Utensils className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold leading-tight text-gray-900">
                  {mealLabel(tx.meal_type)}
                </h3>
                <p className="mt-0.5 text-xs font-medium text-gray-600">
                  <span className="text-gray-800">Site:</span> {tx.site_name ?? tx.site_id ?? "—"}
                </p>
                <p className="text-xs text-gray-500">{formatTime(tx.timestamp)}</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {tx.is_guest_pass ? (
                    <span className="inline-block rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                      Guest pass
                    </span>
                  ) : null}
                  {tx.is_manual ? (
                    <span className="inline-block rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                      Manual entry
                    </span>
                  ) : null}
                </div>
                {tx.description ? (
                  <p className="mt-1 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700">Note:</span> {tx.description}
                  </p>
                ) : null}
                {tx.block_reason ? (
                  <p className="mt-1 inline-block rounded-md bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">
                    <span className="font-bold text-red-700">Reason:</span>{" "}
                    {tx.block_reason.replaceAll("_", " ")}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col items-end shrink-0">
              <span className={`font-black text-lg ${
                tx.status === "SUCCESS" ? "text-gray-900" : "text-gray-400 line-through"
              }`}>
                {tx.status === "SUCCESS" ? "-1" : "—"}
              </span>
              <div className="flex items-center gap-1 mt-1">
                {tx.status === "SUCCESS" ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-500" />
                )}
                <span className={`text-[10px] font-bold ${
                  tx.status === "SUCCESS" ? "text-emerald-600" : "text-red-500"
                }`}>
                  {tx.status}
                </span>
              </div>
            </div>
          </div>
        ))}

        {/* Load more */}
        {!loading && hasMore && transactions.length > 0 && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full py-3 text-indigo-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-50 rounded-2xl transition-colors"
          >
            {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loadingMore ? "Loading..." : "Load more"}
          </button>
        )}
      </div>
    </div>
  );
}
