"use client";

/**
 * Resident Dashboard — MealTrace
 *
 * Wiring doc §3.1 — App shell after login:
 *   Parallel fetch: GET /resident/profile + GET /resident/balance + GET /resident/qr-code
 *
 * Wiring doc §3.2 — QR code card:
 *   qr_base64 → <img src="data:image/png;base64,...">
 *   Offline: shows stale QR with a stale indicator
 *
 * UI improvements:
 *  - Real name, balance, plan details from backend
 *  - Fullscreen QR modal with real image
 *  - Graceful skeleton loading state
 *  - Error state with retry
 */

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/apiClient";
import type { ResidentProfile, ResidentBalance, QRCodeResponse } from "@/lib/types";
import { QrCode, CreditCard, PlusCircle, Maximize, Bell, RefreshCw, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";

// ── Skeleton card ─────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />;
}

export default function ResidentDashboard() {
  const { userId } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [profile, setProfile] = useState<ResidentProfile | null>(null);
  const [balance, setBalance] = useState<ResidentBalance | null>(null);
  const [qr, setQr] = useState<QRCodeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Wiring doc §3.1 — parallel fetch
      const [profileData, balanceData, qrData] = await Promise.all([
        api.get<ResidentProfile>("/resident/profile"),
        api.get<ResidentBalance>("/resident/balance"),
        api.get<QRCodeResponse>("/resident/qr-code"),
      ]);
      setProfile(profileData);
      setBalance(balanceData);
      setQr(qrData);
      // Cache QR for offline use (wiring doc §3.2)
      if (qrData?.qr_base64) {
        localStorage.setItem("cachedQR", qrData.qr_base64);
        localStorage.setItem("cachedQRTime", Date.now().toString());
        setStale(false);
      }
    } catch {
      // Attempt to show cached QR when offline
      const cached = localStorage.getItem("cachedQR");
      if (cached) {
        setQr({ qr_base64: cached, generated_at: new Date().toISOString() });
        setStale(true);
      }
      setError("Could not load fresh data. Showing cached information.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ── Formatted expiry ────────────────────────────────────────────────────────
  const expiryLabel = balance?.plan_expiry
    ? `Valid till ${new Date(balance.plan_expiry).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })}`
    : null;

  const qrSrc = qr?.qr_base64
    ? `data:image/png;base64,${qr.qr_base64}`
    : null;

  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500 pb-24 relative">

      {/* Fullscreen QR Modal */}
      {expanded && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-200">
          <h2 className="text-2xl font-bold mb-2">Scan to Eat</h2>
          {stale && (
            <p className="text-amber-600 text-xs font-semibold mb-4 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-200">
              📶 Offline — showing cached QR
            </p>
          )}
          <div className="w-72 h-72 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl flex items-center justify-center border-4 border-indigo-100 shadow-2xl mb-12">
            {qrSrc ? (
              <img src={qrSrc} alt="Meal QR Code" className="w-full h-full object-contain rounded-3xl" />
            ) : (
              <QrCode className="w-48 h-48 text-indigo-900" />
            )}
          </div>
          <button
            onClick={() => setExpanded(false)}
            className="bg-slate-100 text-slate-600 font-bold px-8 py-3 rounded-full hover:bg-slate-200 active:scale-95 transition-transform"
          >
            Close
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-indigo-600 font-bold text-sm">Hello,</p>
          {loading ? (
            <Skeleton className="h-7 w-36 mt-1 bg-slate-200" />
          ) : (
            <h1 className="text-2xl font-bold text-slate-900">{profile?.name ?? "Resident"}</h1>
          )}
        </div>
        <Link
          href="/resident/notifications"
          className="bg-indigo-100 p-2.5 rounded-full hover:bg-indigo-200 transition-colors active:scale-95 text-indigo-600"
        >
          <Bell className="w-5 h-5" />
        </Link>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium px-4 py-3 rounded-2xl mb-4">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={fetchDashboard} className="ml-2">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Balance Card */}
      <div className="bg-white/90 backdrop-blur-md rounded-[32px] p-7 shadow-2xl shadow-indigo-500/10 border border-white/50 flex flex-col justify-between relative overflow-hidden group mb-4">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-70 group-hover:scale-110 transition-transform duration-700" />
        <p className="text-gray-500 font-semibold text-sm flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-indigo-400" /> meal credits
        </p>
        {loading ? (
          <Skeleton className="h-14 w-24 mt-2 mb-2" />
        ) : (
          <h2 className="text-6xl font-black text-gray-900 mt-2 mb-2 z-10 tracking-tight">
            {balance?.balance ?? "—"}
          </h2>
        )}
        {loading ? (
          <Skeleton className="h-6 w-44 rounded-full" />
        ) : (
          <p className="text-indigo-700 text-xs font-bold bg-indigo-50/80 backdrop-blur-sm w-max px-4 py-1.5 rounded-full mt-2 border border-indigo-100/50">
            {balance?.active_plan ?? "No active plan"}
            {expiryLabel ? ` • ${expiryLabel}` : ""}
          </p>
        )}
      </div>

      {/* QR Code Section */}
      <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-gray-200/50 flex flex-col items-center justify-center space-y-5 border border-gray-100 mt-4 relative">
        <button
          onClick={() => setExpanded(true)}
          className="absolute top-4 right-4 text-gray-400 hover:text-indigo-600 bg-gray-50 p-2 rounded-full transition-colors focus:outline-none"
        >
          <Maximize className="w-5 h-5" />
        </button>
        <p className="text-gray-500 font-medium tracking-wide text-sm">Scan at the counter</p>
        {stale && (
          <span className="text-amber-600 text-[10px] font-bold bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            📶 Offline QR
          </span>
        )}
        <div
          onClick={() => setExpanded(true)}
          className="bg-white p-5 rounded-[2.5rem] shadow-[inset_0_-4px_10px_rgba(0,0,0,0.02),0_10px_30px_rgba(0,0,0,0.05)] relative group cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
        >
          {loading ? (
            <Skeleton className="w-44 h-44 rounded-2xl" />
          ) : qrSrc ? (
            <img src={qrSrc} alt="Meal QR Code" className="w-44 h-44 object-contain" />
          ) : (
            <QrCode className="w-44 h-44 text-slate-800 drop-shadow-sm group-hover:text-indigo-600 transition-colors duration-300" strokeWidth={1} />
          )}
          <div className="absolute inset-0 bg-indigo-600/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] flex items-center justify-center">
            <Maximize className="text-indigo-600 w-10 h-10 drop-shadow-lg" />
          </div>
        </div>
        <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest bg-indigo-50/50 py-1.5 px-4 rounded-full">
          Tap to expand
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <Link
          href="/resident/plans"
          className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-[24px] p-5 flex flex-col items-center gap-3 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-1 transition-all active:scale-95"
        >
          <PlusCircle className="w-7 h-7 opacity-90" />
          <span className="font-bold text-sm">Top Up Plan</span>
        </Link>
        <Link
          href="/resident/guest-pass"
          className="bg-white text-indigo-600 border border-indigo-50 rounded-[24px] p-5 flex flex-col items-center gap-3 shadow-lg shadow-gray-100/80 hover:shadow-gray-200 hover:-translate-y-1 transition-all active:scale-95"
        >
          <CreditCard className="w-7 h-7 opacity-90" />
          <span className="font-bold text-sm">Guest Pass</span>
        </Link>
      </div>
    </div>
  );
}
