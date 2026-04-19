"use client";

/**
 * Guest Pass
 *
 * POST /guest-pass/purchase
 */

import { useEffect, useState } from "react";
import { QrCode, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import Image from "next/image";

interface GuestPassResponse {
  id: string;
  qr_base64: string;
  status: "UNUSED" | "USED";
  expiry_at: string;
}

export default function GuestPassPage() {
  const [loading, setLoading] = useState(false);
  const [passData, setPassData] = useState<GuestPassResponse | null>(null);
  const [error, setError] = useState("");
  const [siteId, setSiteId] = useState("");

  useEffect(() => {
    api.get<{ site_id: string }>("/resident/profile")
      .then((profile) => setSiteId(profile.site_id))
      .catch(() => setError("Unable to load resident site for guest pass."));
  }, []);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      if (!siteId) throw new Error("Missing site assignment");
      
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error("Razorpay SDK failed to load. Are you online?");
      }

      // 1. Create Order for ₹100 guest pass
      const order = await api.post<any>("/payments/create-order", { 
        guest_pass: true 
      });

      // 2. Open Razorpay Widget
      const options = {
        key: order.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        name: "MealTrace Digital",
        description: "Guest Pass Purchase",
        order_id: order.order_id,
        handler: async function (response: any) {
             try {
                // 3. Complete actual purchase to get QR
                const res = await api.post<GuestPassResponse>("/guest-pass/purchase", { site_id: siteId });
                setPassData(res);
             } catch (err: any) {
                setError(err.message || "Payment succeeded but failed to generate pass");
             }
        },
        theme: {
          color: "#4f46e5",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setError("Payment failed: " + response.error.description);
      });
      rzp.open();

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate guest pass order");
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
             className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60 transition-all shadow-md shadow-indigo-200"
             disabled={loading || !siteId}
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
          <p className="text-sm text-slate-500 mb-8 font-medium">Valid for 24 hours from issue</p>
          
          <div className="bg-white border-4 border-indigo-50 rounded-2xl p-4 inline-block shadow-inner mb-6 relative w-48 h-48">
             <Image 
               fill
              src={`data:image/png;base64,${passData.qr_base64}`} 
               alt="Guest Pass QR" 
               className="object-contain"
               unoptimized
             />
          </div>
          
          <p className="text-indigo-600 font-bold bg-indigo-50 py-2 rounded-xl">ID: {passData.id}</p>
        </div>
      )}
    </div>
  );
}
