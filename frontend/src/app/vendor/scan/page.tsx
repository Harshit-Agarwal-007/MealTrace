"use client";

/**
 * Vendor Scanner — single validate per scan; scanner cleared when showing result;
 * region element remounts after Declined/Success.
 * Uses Html5Qrcode (not Html5QrcodeScanner) so we open the back camera immediately
 * with facingMode: environment — no camera-picker modal or “Start Scanning” step.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import { CheckCircle2, XCircle, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/apiClient";
import type { ScanValidateResponse } from "@/lib/types";
import { Html5Qrcode } from "html5-qrcode";

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
  const [scannerRegionKey, setScannerRegionKey] = useState(0);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanLockRef = useRef(false);

  const siteId = typeof window !== "undefined" ? localStorage.getItem("vendorSiteId") ?? "" : "";

  const regionElementId = `qr-scanner-region-${scannerRegionKey}`;

  const validateScan = useCallback(
    async (qrPayload: string) => {
      if (scanLockRef.current) return;
      if (!siteId) {
        setScanResult({
          status: "BLOCKED",
          block_reason: "No site selected. Choose a site first on the Vendor home screen.",
        });
        return;
      }
      scanLockRef.current = true;
      try {
        scannerRef.current?.pause(true);
      } catch {
        /* ignore */
      }
      setScanning(true);

      try {
        const result = await api.post<ScanValidateResponse>("/scan/validate", {
          qr_payload: qrPayload,
          site_id: siteId,
          vendor_id: userId,
        });
        setScanResult(result);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Scan failed. Try again.";
        const isNetwork = /failed to fetch|networkerror|load failed/i.test(msg);
        const base =
          typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
            ? process.env.NEXT_PUBLIC_API_URL
            : "http://localhost:8000";
        setScanResult({
          status: "BLOCKED",
          block_reason: isNetwork
            ? `Failed to reach API (${base}). Check backend is running and NEXT_PUBLIC_API_URL is correct.`
            : msg,
        });
      } finally {
        setScanning(false);
        const s = scannerRef.current;
        if (s) {
          scannerRef.current = null;
          void (async () => {
            try {
              await s.stop();
            } catch {
              /* already stopped */
            }
            try {
              s.clear();
            } catch {
              /* ignore */
            }
          })();
        }
      }
    },
    [siteId, userId]
  );

  async function stopScanner(s: Html5Qrcode | null) {
    if (!s) return;
    try {
      await s.stop();
    } catch {
      /* not running */
    }
    try {
      s.clear();
    } catch {
      /* ignore */
    }
  }

  const initScanner = useCallback(async () => {
    if (!siteId) return;

    await stopScanner(scannerRef.current);
    scannerRef.current = null;

    scanLockRef.current = false;
    setCameraError(null);

    let html5: Html5Qrcode;
    try {
      html5 = new Html5Qrcode(regionElementId, false);
    } catch {
      setCameraError("Scanner could not initialize.");
      return;
    }

    scannerRef.current = html5;

    const cameraConfig = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 16 / 9,
    };

    const onDecode = (decodedText: string) => {
      if (!decodedText?.trim()) return;
      void validateScan(decodedText.trim());
    };

    /** Try constraint; reset element on failure so a second start isn’t wedged */
    async function tryFacing(constraint: MediaTrackConstraints): Promise<boolean> {
      try {
        await html5!.start(constraint, cameraConfig, onDecode, () => {});
        return true;
      } catch {
        await stopScanner(html5!);
        return false;
      }
    }

    if (await tryFacing({ facingMode: { ideal: "environment" } })) return;

    html5 = new Html5Qrcode(regionElementId, false);
    scannerRef.current = html5;

    // Laptop / desktop usually only has an inward-facing webcam (“user”).
    if (await tryFacing({ facingMode: { ideal: "user" } })) return;

    html5 = new Html5Qrcode(regionElementId, false);
    scannerRef.current = html5;

    try {
      const devices = await Html5Qrcode.getCameras();
      const labeled =
        devices.find((d) => /back|rear|environment/i.test(d.label)) ??
        devices.find((d) => /front|user|fac/i.test(d.label)) ??
        devices[devices.length - 1] ??
        devices[0];
      if (!labeled?.id) {
        setCameraError("No camera found.");
        scannerRef.current = null;
        await stopScanner(html5);
        return;
      }
      await html5.start(labeled.id, cameraConfig, onDecode, () => {});
    } catch (e) {
      scannerRef.current = null;
      await stopScanner(html5);
      const msg =
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera permission denied. Allow camera access for this site and try again."
          : e instanceof DOMException && e.name === "NotReadableError"
            ? "Camera is busy or unavailable. Close other apps using the webcam and reload."
            : "Could not start the camera. In Chrome open the padlock beside the URL → Site settings → Camera → Allow.";
      setCameraError(msg);
    }
  }, [siteId, validateScan, regionElementId]);

  useEffect(() => {
    if (!siteId || scanResult !== null) {
      void (async () => {
        const s = scannerRef.current;
        scannerRef.current = null;
        await stopScanner(s);
      })();
      return;
    }

    let cancelled = false;
    const t = requestAnimationFrame(() => {
      void (async () => {
        await initScanner();
        if (cancelled && scannerRef.current) {
          const s = scannerRef.current;
          scannerRef.current = null;
          await stopScanner(s);
        }
      })();
    });

    return () => {
      cancelled = true;
      cancelAnimationFrame(t);
      void (async () => {
        const s = scannerRef.current;
        scannerRef.current = null;
        await stopScanner(s);
      })();
    };
  }, [siteId, scanResult, scannerRegionKey, initScanner]);

  const handleNextScan = () => {
    scanLockRef.current = false;
    setScanResult(null);
    setScannerRegionKey((k) => k + 1);
  };

  if (scanResult?.status === "SUCCESS") {
    return (
      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-emerald-500 p-6 animate-in zoom-in duration-300">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-400 to-emerald-600" />
        <div className="mb-8 rounded-full bg-white/20 p-6">
          <CheckCircle2 className="h-24 w-24 text-white" />
        </div>
        <h2 className="mb-2 text-5xl font-black tracking-tight text-white">Approved</h2>
        <p className="text-center text-xl font-medium text-emerald-50">{scanResult.resident_name}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          {scanResult.meal_type && (
            <span className="rounded-full border border-emerald-600/50 bg-emerald-800/80 px-4 py-1.5 text-sm font-bold text-emerald-100 backdrop-blur-sm">
              {scanResult.meal_type}
            </span>
          )}
          {scanResult.dietary_preference && (
            <span className="rounded-full border border-emerald-600/50 bg-emerald-800/80 px-4 py-1.5 text-sm font-bold text-emerald-100 backdrop-blur-sm">
              {scanResult.dietary_preference}
            </span>
          )}
        </div>
        <div className="mt-8 flex items-center gap-4 rounded-3xl border border-white/10 bg-black/20 px-8 py-4 backdrop-blur-md">
          <div className="text-center">
            <p className="mb-1 text-xs font-bold uppercase tracking-widest text-emerald-100">Balance remaining</p>
            <p className="text-4xl font-black text-white">{scanResult.balance_after ?? "—"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleNextScan}
          className="mt-12 w-full max-w-sm rounded-2xl bg-white px-8 py-4 text-lg font-bold text-emerald-600 shadow-xl transition-transform active:scale-95"
        >
          Scan next user
        </button>
      </div>
    );
  }

  if (scanResult?.status === "BLOCKED") {
    const label = scanResult.block_reason
      ? BLOCK_LABELS[scanResult.block_reason] ?? scanResult.block_reason.replaceAll("_", " ")
      : "Scan blocked";
    return (
      <div className="relative z-10 flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-red-500 p-6 animate-in zoom-in duration-300">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-400 to-red-600" />
        <div className="mb-8 animate-pulse rounded-full bg-white/20 p-6">
          <XCircle className="h-24 w-24 text-white" />
        </div>
        <h2 className="mb-2 text-5xl font-black tracking-tight text-white">Declined</h2>
        <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-6 py-3 text-center text-lg font-bold text-red-50 backdrop-blur-md">
          {label}
        </p>
        <button
          type="button"
          onClick={handleNextScan}
          className="mt-12 w-full max-w-sm rounded-2xl bg-white px-8 py-4 text-lg font-bold text-red-600 shadow-xl transition-transform active:scale-95"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-10 flex h-[100dvh] w-full flex-col bg-slate-50 animate-in fade-in">
      <div className="relative z-20 flex items-center border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur-md">
        <Link
          href="/vendor"
          className="absolute left-4 rounded-full border border-slate-200 bg-white p-3 shadow-sm transition-all active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </Link>
        <h2 className="flex-1 text-center text-lg font-bold tracking-wide text-slate-900">Scan QR</h2>
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-indigo-50/80 to-slate-50" />

        {!siteId && (
          <div className="relative z-20 mb-4 max-w-xs rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-center text-sm font-medium text-amber-900">
            No site selected. Choose a site first.
          </div>
        )}

        {siteId && cameraError && (
          <div className="relative z-20 mb-4 max-w-sm rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-center text-sm font-medium text-red-900">
            {cameraError}
          </div>
        )}

        <div className="relative z-10 w-full max-w-md px-4">
          <div
            key={scannerRegionKey}
            id={regionElementId}
            className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg ring-1 ring-slate-100"
          />
          {scanning && (
            <div className="mt-4 flex justify-center">
              <Loader2 className="z-10 h-8 w-8 animate-spin text-indigo-600" />
            </div>
          )}
        </div>

        <p className="relative z-10 mt-8 rounded-full border border-slate-200 bg-white/90 px-6 py-2 text-lg font-bold tracking-wide text-slate-700 shadow-sm backdrop-blur-sm">
          {scanning ? "Validating…" : "Align QR code within frame"}
        </p>
      </div>
    </div>
  );
}
