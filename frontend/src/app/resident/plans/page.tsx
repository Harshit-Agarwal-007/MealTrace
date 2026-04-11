"use client";

/**
 * Plans Page
 *
 * GET /plans (active plans)
 * POST /payment/plans/{id}/checkout (create razorpay order)
 *
 * Mocking the actual Razorpay widget window.Razorpay for now,
 * but the backend flow is fully real.
 */

import { useState, useEffect } from "react";
import { CheckCircle2, ChevronLeft, CreditCard, Loader2 } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import type { PlanInfo, CreateOrderResponse } from "@/lib/types";
import { useRouter } from "next/navigation";

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    api.get<PlanInfo[]>("/plans")
       .then(setPlans)
       .catch(() => {})
       .finally(() => setLoading(false));
  }, []);

  const handlePurchase = async () => {
    if (!selectedPlanId) return;
    setProcessing(true);
    try {
      const order = await api.post<CreateOrderResponse>(`/payment/plans/${selectedPlanId}/checkout`);
      
      // Simulate Razorpay window (for demo purposes)
      // In production, load https://checkout.razorpay.com/v1/checkout.js and new window.Razorpay(...)
      
      // We will pretend Payment succeeded and call backend success endpoint
      // Note: Actually, in Razorpay webhooks handle the success. For PWA demo we assume success via UI trigger or we wait.
      alert(`Razorpay order created! ID: ${order.order_id}\nAmount: ${order.amount / 100} INR`);
      router.push("/resident");

    } catch (err: any) {
      alert(err.message || "Failed to create order");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="p-6 pt-8 pb-24 animate-in fade-in duration-500 bg-slate-50 min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/resident" className="bg-white p-2.5 rounded-full shadow-sm">
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <h1 className="text-2xl font-black text-slate-900">Meal Plans</h1>
      </div>

      {loading ? (
         <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
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
              
              <ul className="space-y-2 mt-6">
                <li className="flex items-center gap-2 text-sm text-slate-600 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> {plan.meal_count} Total Credits
                </li>
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 pb-safe animate-in slide-in-from-bottom">
         <button 
           disabled={!selectedPlanId || processing}
           onClick={handlePurchase}
           className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100 active:scale-95 transition-all shadow-lg shadow-indigo-200"
         >
            {processing ? <Loader2 className="w-5 h-5 animate-spin"/> : <><CreditCard className="w-5 h-5" /> Proceed to Pay</>}
         </button>
      </div>
    </div>
  );
}
