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
      <div className="text-white mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">History</h1>
          <p className="text-indigo-100 text-sm">Your recent meal scans</p>
        </div>
        <button onClick={() => fetchPage(1)} className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
          <RefreshCw className="w-4 h-4 text-white" />
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
              <div>
                <h3 className="font-bold text-gray-900 leading-tight capitalize">
                  {tx.meal_type?.toLowerCase() ?? "Meal"}
                </h3>
                <p className="text-xs text-gray-500">
                  {tx.site_name ?? tx.site_id ?? "—"} • {formatTime(tx.timestamp)}
                </p>
                {tx.status === "BLOCKED" && tx.block_reason && (
                  <p className="text-xs font-semibold text-red-500 mt-1 bg-red-50 inline-block px-1.5 py-0.5 rounded">
                    {tx.block_reason.replaceAll("_", " ")}
                  </p>
                )}
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
