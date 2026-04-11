"use client";

/**
 * PWA QR Scanner — MealTrace
 *
 * Captures `site_id` from localStorage.
 * Reads QR payloads and sends them to POST /scan/validate.
 * Includes auto-advance UX to rapidly clear queues.
 */

import { useState, useEffect } from "react";
import { QrCode, History, Settings, Zap, CheckCircle2, XCircle, ChevronLeft, Search } from "lucide-react";
import Link from "next/link";
import { Scanner } from "@yudiel/react-qr-scanner";
import { useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";
import type { ScanValidateResponse } from "@/lib/types";

// User-friendly mappings for block reasons
const BLOCK_MESSAGES: Record<string, string> = {
  ZERO_BALANCE: "Insufficient credits",
  ALREADY_SCANNED: "Already scanned for this meal",
  EXPIRED_PLAN: "Meal plan expired",
  INVALID_TIME: "Outside operating hours",
  INVALID_SITE: "Resident not assigned here",
  INVALID_SIGNATURE: "QR Code Tampered/Invalid",
  EXPIRED_QR: "QR Code Expired",
  GUEST_PASS_USED: "Guest pass already used",
  UNKNOWN: "System blocked scan",
};

export default function VendorScannerPage() {
  const router = useRouter();
  const [siteId, setSiteId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState<string | null>(null);
  
  const [scanState, setScanState] = useState<"IDLE" | "PROCESSING" | "SUCCESS" | "BLOCKED">("IDLE");
  const [scanResult, setScanResult] = useState<ScanValidateResponse | null>(null);
  const [manualError, setManualError] = useState("");

  useEffect(() => {
    const sId = localStorage.getItem("vendor_site_id");
    const sName = localStorage.getItem("vendor_site_name");
    if (!sId) {
      router.replace("/vendor"); // Ensure site is picked
      return;
    }
    setSiteId(sId);
    setSiteName(sName);
  }, [router]);

  // Handle successful QR detection
  const handleScan = async (text: string) => {
    if (scanState !== "IDLE") return;
    setScanState("PROCESSING");
    setManualError("");

    try {
      const res = await api.post<ScanValidateResponse>("/scan/validate", {
        qr_payload: text,
        site_id: siteId,
      });

      setScanResult(res);
      setScanState(res.status);
      
      // Auto-reset UI after 2.5s for fast queue clearing
      setTimeout(() => {
        setScanState("IDLE");
        setScanResult(null);
      }, 2500);

    } catch (err: any) {
      setScanResult({
        status: "BLOCKED",
        block_reason: "UNKNOWN"
      });
      setManualError(err.message || "Network error");
      setScanState("BLOCKED");
      
      setTimeout(() => {
        setScanState("IDLE");
        setScanResult(null);
        setManualError("");
      }, 3000);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] bg-black text-white relative">
      {/* Top Navigation */}
      <div className="absolute top-0 w-full z-10 p-4 safe-top flex justify-between items-center bg-gradient-to-b from-black/80 to-transparent">
        <Link href="/vendor" className="bg-white/10 backdrop-blur-md p-2 rounded-full">
           <ChevronLeft className="w-6 h-6 text-white" />
        </Link>
        <div className="flex gap-3">
          <Link href="/vendor/manual" className="bg-white/10 backdrop-blur-md p-2 rounded-full flex items-center justify-center">
             <Search className="w-5 h-5 text-white" />
          </Link>
          <button className="bg-white/10 backdrop-blur-md p-2 rounded-full">
             <Settings className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Main Scanner Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden">
        
        {/* Core Scanner Library */}
        <div className="absolute inset-0 z-0 flex items-center justify-center">
           {scanState === "IDLE" && (
             <Scanner 
               onResult={(text) => handleScan(text)} 
               onError={(error) => console.log(error?.message)}
               options={{
                 delayBetweenScanAttempts: 300,
                 delayBetweenScanSuccess: 1000
               }}
               components={{ audio: false, zoom: false }}
             />
           )}
        </div>

        {/* Reticle Overlay */}
        {scanState === "IDLE" && (
          <div className="z-10 pointer-events-none relative flex flex-col items-center justify-center h-full w-full">
            <div className="w-64 h-64 border-2 border-white/40 rounded-3xl relative">
              <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-3xl"></div>
              <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-3xl"></div>
              <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-3xl"></div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-3xl"></div>
              
              <div className="absolute left-0 w-full h-0.5 bg-emerald-400/50 shadow-[0_0_8px_rgba(52,211,153,0.8)] top-0 animate-[scan_2s_ease-in-out_infinite]"></div>
            </div>
            {siteName && (
               <div className="mt-8 bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-medium border border-white/10 tracking-widest uppercase">
                 Scan at {siteName}
               </div>
            )}
          </div>
        )}

        {/* Status Overlays */}
        {scanState === "SUCCESS" && (
          <div className="absolute inset-0 z-20 bg-emerald-500 flex flex-col items-center justify-center animate-in fade-in duration-200">
            <CheckCircle2 className="w-32 h-32 text-white mb-4 drop-shadow-lg" />
            <h2 className="text-4xl font-black tracking-tight drop-shadow-md text-white">{scanResult?.resident_name || "Success"}</h2>
            {scanResult?.dietary_preference && (
               <p className="font-bold text-emerald-100 bg-black/10 px-4 py-1 rounded-full mt-2 uppercase tracking-widest text-sm">
                 {scanResult.dietary_preference}
               </p>
            )}
            <p className="font-medium text-emerald-100 mt-4 bg-black/20 px-4 py-2 rounded-xl text-sm border border-emerald-400/30">
              Bal: {scanResult?.balance_after} cr
            </p>
          </div>
        )}

        {scanState === "BLOCKED" && (
          <div className="absolute inset-0 z-20 bg-red-600 flex flex-col items-center justify-center animate-in fade-in duration-200 px-6 text-center">
            <XCircle className="w-32 h-32 text-white mb-4 drop-shadow-lg" />
            <h2 className="text-3xl font-black tracking-tight drop-shadow-md text-white mb-2">Scan Blocked</h2>
            <div className="bg-white text-red-600 px-4 py-2 rounded-xl font-bold shadow-lg">
               {BLOCK_MESSAGES[scanResult?.block_reason || "UNKNOWN"]}
            </div>
            {manualError && <p className="text-xs text-red-200 mt-4 opacity-70">{manualError}</p>}
          </div>
        )}

        {scanState === "PROCESSING" && (
          <div className="absolute inset-0 z-20 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mb-4" />
            <p className="font-medium text-indigo-200 tracking-wider text-sm animate-pulse">VERIFYING QR...</p>
          </div>
        )}
      </div>

    </div>
  );
}
