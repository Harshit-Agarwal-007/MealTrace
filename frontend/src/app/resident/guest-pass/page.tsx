"use client";

/**
 * Guest Pass
 *
 * POST /scan/guest-pass
 */

import { useState } from "react";
import { QrCode, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import Image from "next/image";

interface GuestPassResponse {
  status: string;
  pass_id: string;
  qr_code_base64: string;
  amount_deducted: number;
}

export default function GuestPassPage() {
  const [loading, setLoading] = useState(false);
  const [passData, setPassData] = useState<GuestPassResponse | null>(null);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.post<GuestPassResponse>("/scan/guest-pass", { meal_type: "GUEST" });
      setPassData(res);
    } catch (err: any) {
      setError(err.message || "Failed to generate guest pass");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 pt-8 pb-24 animate-in fade-in duration-500 bg-slate-50 min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/resident" className="bg-white p-2.5 rounded-full shadow-sm">
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <h1 className="text-2xl font-black text-slate-900">Guest Pass</h1>
      </div>

      {!passData ? (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 text-center">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-6">
             <QrCode className="w-10 h-10 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Generate One-Time Pass</h2>
          <p className="text-sm text-slate-500 mb-8">This will create a temporary QR code valid for a single meal. Flat rate of ₹100 will be charged.</p>
          
          {error && <p className="text-red-500 text-sm font-bold mb-4">{error}</p>}
          
          <button 
             onClick={handleGenerate}
             disabled={loading}
             className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-md shadow-indigo-200"
          >
             {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generate Pass — ₹100"}
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-indigo-100/50 border border-indigo-50 text-center animate-in zoom-in-95">
          <div className="flex justify-center mb-6">
             <div className="bg-emerald-50 text-emerald-500 p-3 rounded-full">
               <CheckCircle2 className="w-8 h-8" />
             </div>
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-1">Pass Generated!</h2>
          <p className="text-sm text-slate-500 mb-8 font-medium">Valid for next 15 minutes</p>
          
          <div className="bg-white border-4 border-indigo-50 rounded-2xl p-4 inline-block shadow-inner mb-6 relative w-48 h-48">
             <Image 
               fill
               src={`data:image/png;base64,${passData.qr_code_base64}`} 
               alt="Guest Pass QR" 
               className="object-contain"
               unoptimized
             />
          </div>
          
          <p className="text-indigo-600 font-bold bg-indigo-50 py-2 rounded-xl">ID: {passData.pass_id}</p>
        </div>
      )}
    </div>
  );
}
