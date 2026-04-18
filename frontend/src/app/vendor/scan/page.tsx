"use client";

/**
 * Vendor Scanner — wiring doc §4.3
 *
 * POST /scan/validate
 * Body: { qr_payload, site_id, vendor_id }
 *   - site_id: from localStorage (set on site picker page)
 *   - vendor_id: from AuthContext.userId (must match JWT sub — wiring doc §4.3)
 *   - qr_payload: decoded string from QR camera
 *
 * UI mapping (wiring doc §4.3):
 *   status === "SUCCESS" → green; show resident_name, meal_type, balance_after, dietary_preference
 *   status === "BLOCKED" → red; map block_reason to human-readable string
 *
 * Auto-advance: reset after ~1.5s per the wiring doc § auto-advance note
 *
 * Camera: uses getUserMedia — per wiring doc §6.2 PWA camera note.
 * Fallback: "Simulate Scan" buttons retained for dev/QA.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { CheckCircle2, XCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/apiClient";
import type { ScanValidateResponse } from "@/lib/types";
import { Html5QrcodeScanner } from "html5-qrcode";

// ── Block reason → human label map ───────────────────────────────────────────
const BLOCK_LABELS: Record<string, string> = {
  INVALID_QR: "Invalid QR Code",
  INACTIVE_RESIDENT: "Resident Inactive",
  WRONG_SITE: "Wrong Site",
  OUTSIDE_MEAL_WINDOW: "Outside Meal Window",
  DUPLICATE_SCAN: "Already Scanned Today",
  ZERO_BALANCE: "No Credits Remaining",
  NOT_IN_PLAN: "Meal Not In Plan",
  EXPIRED_PLAN: "Plan Expired",
};

export default function VendorScanner() {
  const { userId } = useAuth();
  const [scanResult, setScanResult] = useState<ScanValidateResponse | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  const siteId = typeof window !== "undefined" ? localStorage.getItem("vendorSiteId") ?? "" : "";

  // ── Scan validation ──────────────────────────────────────────────────────────
  const validateScan = useCallback(async (qrPayload: string) => {
    if (scanning) return; // prevent double-tap
    setScanning(true);
    try {
      // wiring doc §4.3 body
      const result = await api.post<ScanValidateResponse>("/scan/validate", {
        qr_payload: qrPayload,
        site_id: siteId,
        vendor_id: userId, // must match JWT sub
      });
      setScanResult(result);

      // Auto-advance after 2s (wiring doc §4.3 auto-advance)
      setTimeout(() => {
        setScanResult(null);
        setScanning(false);
      }, 2000);
    } catch (err) {
      setScanResult({
        status: "BLOCKED",
        block_reason: err instanceof Error ? err.message : "Scan failed. Try again.",
      });
      setTimeout(() => {
        setScanResult(null);
        setScanning(false);
      }, 2500);
    }
  }, [scanning, siteId, userId]);

  useEffect(() => {
    if (!siteId) {
      return;
    }
    const scanner = new Html5QrcodeScanner(
      "qr-scanner-region",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );
    scannerRef.current = scanner;
    scanner.render(
      (decodedText) => {
        void validateScan(decodedText);
      },
      () => {
        // ignore per-frame decode failures
      }
    );
    return () => {
      if (scannerRef.current) {
        void scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, [siteId, validateScan]);

  // ── DEV simulate helpers ─────────────────────────────────────────────────────
  const simulateSuccess = () =>
    setScanResult({
      status: "SUCCESS",
      resident_name: "Harshit Agarwal",
      meal_type: "LUNCH",
      balance_after: 41,
      dietary_preference: "VEG",
    });

  const simulateFail = () =>
    setScanResult({ status: "BLOCKED", block_reason: "OUTSIDE_MEAL_WINDOW" });

  // ── Result screens ───────────────────────────────────────────────────────────
  if (scanResult?.status === "SUCCESS") {
    return (
      <div className="h-full bg-emerald-500 flex flex-col items-center justify-center p-6 animate-in zoom-in duration-300 relative overflow-hidden z-10 w-full min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-400 to-emerald-600 -z-10" />
        <div className="bg-white/20 p-6 rounded-full mb-8">
          <CheckCircle2 className="w-24 h-24 text-white" />
        </div>
        <h2 className="text-5xl font-black text-white mb-2 tracking-tight">Approved</h2>
        <p className="text-emerald-50 text-xl font-medium text-center">{scanResult.resident_name}</p>
        <div className="mt-4 flex gap-3 flex-wrap justify-center">
          {scanResult.meal_type && (
            <span className="bg-emerald-800/80 border border-emerald-600/50 text-emerald-100 px-4 py-1.5 rounded-full text-sm font-bold backdrop-blur-sm">
              {scanResult.meal_type}
            </span>
          )}
          {scanResult.dietary_preference && (
            <span className="bg-emerald-800/80 border border-emerald-600/50 text-emerald-100 px-4 py-1.5 rounded-full text-sm font-bold backdrop-blur-sm">
              {scanResult.dietary_preference}
            </span>
          )}
        </div>
        <div className="mt-8 bg-black/20 px-8 py-4 rounded-3xl flex items-center gap-4 backdrop-blur-md border border-white/10">
          <div className="text-center">
            <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Balance Remaining</p>
            <p className="text-white font-black text-4xl">{scanResult.balance_after ?? "—"}</p>
          </div>
        </div>
        <button
          onClick={() => { setScanResult(null); setScanning(false); }}
          className="mt-12 bg-white text-emerald-600 font-bold text-lg px-8 py-4 rounded-2xl w-full active:scale-95 transition-transform shadow-xl shadow-emerald-900/20"
        >
          Scan Next User
        </button>
      </div>
    );
  }

  if (scanResult?.status === "BLOCKED") {
    const label = scanResult.block_reason
      ? BLOCK_LABELS[scanResult.block_reason] ?? scanResult.block_reason.replaceAll("_", " ")
      : "Scan Blocked";
    return (
      <div className="h-full bg-red-500 flex flex-col items-center justify-center p-6 animate-in zoom-in duration-300 relative overflow-hidden z-10 w-full min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-400 to-red-600 -z-10" />
        <div className="bg-white/20 p-6 rounded-full mb-8 animate-pulse">
          <XCircle className="w-24 h-24 text-white" />
        </div>
        <h2 className="text-5xl font-black text-white mb-2 tracking-tight">Declined</h2>
        <p className="text-red-50 text-lg font-bold text-center bg-black/20 px-6 py-3 rounded-2xl mt-4 backdrop-blur-md border border-white/10">
          {label}
        </p>
        <button
          onClick={() => { setScanResult(null); setScanning(false); }}
          className="mt-12 bg-white text-red-600 font-bold text-lg px-8 py-4 rounded-2xl w-full active:scale-95 transition-transform shadow-xl shadow-red-900/20"
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Camera View ──────────────────────────────────────────────────────────────
  return (
    <div className="h-[100dvh] flex flex-col animate-in fade-in absolute inset-0 w-full bg-black z-10">
      {/* Top bar */}
      <div className="p-4 flex items-center relative z-20 bg-gradient-to-b from-black/80 to-transparent pb-10">
        <Link href="/vendor" className="bg-neutral-800/80 p-3 rounded-full absolute left-4 active:scale-95 transition-all backdrop-blur-sm border border-neutral-700">
          <ArrowLeft className="w-5 h-5 text-white" />
        </Link>
        <h2 className="flex-1 text-center font-bold text-xl text-white tracking-wide">Scan QR</h2>
      </div>

      <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-black" />

        {/* Camera error */}
        {!siteId && (
          <div className="relative z-20 bg-neutral-900/80 border border-neutral-700 text-neutral-300 text-sm font-medium px-5 py-3 rounded-2xl mb-4 text-center max-w-xs">
            No site selected. Choose a site first.
          </div>
        )}

        {/* Scanner mount */}
        <div className="relative z-10 w-full max-w-md px-4">
          <div id="qr-scanner-region" className="rounded-2xl overflow-hidden" />
          {scanning && (
            <div className="mt-4 flex justify-center">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin z-10" />
            </div>
          )}
        </div>

        <p className="relative z-10 mt-8 font-bold text-white text-lg bg-black/40 px-6 py-2 rounded-full backdrop-blur-md tracking-wide">
          {scanning ? "Validating..." : "Align QR code within frame"}
        </p>

        {/* Dev simulation buttons */}
        <div className="relative z-10 flex gap-4 mt-auto mb-10 border border-neutral-800 bg-neutral-900/80 p-2 rounded-2xl backdrop-blur-xl">
          <button
            onClick={simulateSuccess}
            className="bg-emerald-500/20 text-emerald-400 px-6 py-3 rounded-xl text-sm font-bold hover:bg-emerald-500/30 transition-colors"
          >
            ✓ Simulate Success
          </button>
          <button
            onClick={simulateFail}
            className="bg-red-500/20 text-red-400 px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-500/30 transition-colors"
          >
            ✗ Simulate Fail
          </button>
        </div>
      </div>
    </div>
  );
}
