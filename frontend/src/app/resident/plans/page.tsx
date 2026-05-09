"use client";

/**
 * Plans Page
 *
 * GET /plans (active plans)
 * POST /payments/create-order (create razorpay order)
 *
 * Mocking the actual Razorpay widget window.Razorpay for now,
 * but the backend flow is fully real.
 */

import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, ChevronLeft, CreditCard, Loader2 } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import type { PlanInfo, CreateOrderResponse, ResidentCatalogResponse, ResidentProfile } from "@/lib/types";
import { useRouter } from "next/navigation";

// Extend Window interface for Razorpay
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [plansPurchaseEnabled, setPlansPurchaseEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [profile, setProfile] = useState<ResidentProfile | null>(null);

  useEffect(() => {
    setLoadError(null);
    Promise.all([
      api.get<ResidentCatalogResponse>("/resident/catalog"),
      api.get<ResidentProfile>("/resident/profile").catch(() => null),
    ])
      .then(([data, prof]) => {
        if (prof) setProfile(prof);
        setPlansPurchaseEnabled(data.plans_purchase_enabled ?? true);
        setPlans(Array.isArray(data.plans) ? data.plans : []);
      })
      .catch((err) => {
        setPlans([]);
        const msg = err instanceof Error ? err.message : String(err);
        const base =
          typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
            ? process.env.NEXT_PUBLIC_API_URL
            : "(defaults to http://localhost:8000)";
        if (/failed to fetch|networkerror|load failed/i.test(msg)) {
          setLoadError(
            `Cannot reach API (${base}). Run the backend, set NEXT_PUBLIC_API_URL in frontend/.env.local, and stay logged in.`
          );
        } else {
          setLoadError(msg || "Could not load meal plans.");
        }
      })
      .finally(() => setLoading(false));
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

  const handlePurchase = async () => {
    if (!selectedPlanId) return;
    setProcessing(true);
    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error("Razorpay SDK failed to load. Are you online?");
      }

      const order = await api.post<CreateOrderResponse>("/payments/create-order", {
        plan_id: selectedPlanId,
        guest_pass: false,
      });

      const options = {
        key: order.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        name: "MealTrace Digital",
        description: "Meal Plan Purchase",
        order_id: order.order_id,
        prefill: {
          email: profile?.email || undefined,
          contact: profile?.phone?.replace(/\D/g, "") || undefined,
        },
        handler: function () {
          router.push("/resident");
        },
        theme: {
          color: "#4f46e5", // Indigo-600
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        alert("Payment failed: " + response.error.description);
      });
      rzp.open();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6 pt-8 pb-44 animate-in fade-in duration-500 bg-slate-50 min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/resident" className="bg-white p-2.5 rounded-full shadow-sm">
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <h1 className="text-2xl font-black text-slate-900">Meal Plans</h1>
      </div>

      {loadError && (
        <div className="mb-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <span>{loadError}</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : plans.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
          <p className="text-lg font-bold text-slate-900">No plans available</p>
          <p className="mt-2 text-sm text-slate-500">
            {plansPurchaseEnabled
              ? "There are no active meal plans for your site right now. Please contact your administrator."
              : "Plan purchases are turned off for your site. Please contact your administrator."}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={`bg-white rounded-3xl p-6 transition-all duration-300 cursor-pointer border-2 relative overflow-hidden ${
                selectedPlanId === plan.id
                  ? "border-indigo-600 shadow-xl shadow-indigo-100 scale-[1.02]"
                  : "border-transparent shadow-md hover:shadow-lg"
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{plan.name}</h3>
                  <p className="text-slate-500 text-sm mt-1">{plan.meals_per_day} meals/day for {plan.duration_days} days</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-indigo-600">₹{plan.price}</p>
                </div>
              </div>

              {plan.description && (
                <p className="text-sm text-slate-600 mt-2 italic border-l-2 border-indigo-200 pl-3">
                  {plan.description}
                </p>
              )}

              <ul className="space-y-2 mt-6">
                <li className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {plan.meal_count} Total Credits
                </li>
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Sticky Bottom Bar — positioned above bottom nav */}
      {plans.length > 0 && (
        <div className="fixed left-0 right-0 z-[60] w-full border-t border-slate-100 bg-white p-4 pb-safe animate-in slide-in-from-bottom bottom-[calc(env(safe-area-inset-bottom)+84px)]">
          <button
            disabled={!selectedPlanId || processing}
            onClick={handlePurchase}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:scale-100 disabled:opacity-50"
          >
            {processing ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <CreditCard className="h-5 w-5" /> Proceed to Pay
              </>
            )}
          </button>
          {!selectedPlanId && (
            <p className="mt-2 text-center text-xs font-medium text-slate-400">Select a plan above to continue</p>
          )}
        </div>
      )}
    </div>
  );
}
