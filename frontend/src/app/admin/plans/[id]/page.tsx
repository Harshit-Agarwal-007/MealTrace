"use client";

import { useState, useEffect, useCallback, use } from "react";
import { 
  ArrowLeft, Save, IndianRupee, Tag, 
  CalendarClock, Trash2, Loader2, CheckCircle2, 
  AlertTriangle, RefreshCw, Layers
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";
import type { PlanInfo } from "@/lib/types";

export default function AdminPlanEdit({ params }: { params: Promise<{id:string}> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      // Backend doesn't have a direct /admin/plans/{id} endpoint, 
      // so we fetch all and find the match.
      const plans = await api.get<PlanInfo[]>("/admin/plans");
      const found = plans.find(p => p.id === id);
      if (found) {
        setPlan(found);
      } else {
        setError("Plan not found");
      }
    } catch (err: any) {
      setError(err.message || "Failed to load plan details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!plan) return;
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      await api.patch(`/admin/plans/${id}`, {
        name: plan.name,
        price: plan.price,
        meal_count: plan.meal_count,
        meals_per_day: plan.meals_per_day,
        duration_days: plan.duration_days,
        description: plan.description,
        is_active: plan.is_active
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save plan changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!plan) return;
    setDeactivating(true);
    try {
      await api.delete(`/admin/plans/${id}`);
      router.push("/admin/plans");
    } catch (err: any) {
      setError(err.message || "Failed to deactivate plan");
    } finally {
      setDeactivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-black tracking-widest uppercase text-[10px]">Loading Pricing Structure...</p>
      </div>
    );
  }

  if (error && !plan) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-[32px] border border-red-100 font-bold max-w-sm mx-auto">
          {error}
        </div>
        <button onClick={() => fetchData()} className="text-indigo-600 font-black flex items-center gap-2 mx-auto">
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="p-6 pt-8 pb-32 animate-in slide-in-from-right duration-500 space-y-6 max-w-lg mx-auto">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-4">
         <Link href="/admin/plans" className="bg-white p-3 rounded-full shadow-sm border border-slate-100 hover:opacity-75 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
         </Link>
         <button 
           onClick={() => handleSave()}
           disabled={saving}
           className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-xs font-black flex items-center gap-2 active:scale-95 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
         >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Updating..." : "Save Plan"}
         </button>
      </div>

      {/* Persistence Feedback */}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3 animate-in slide-in-from-top duration-300">
           <CheckCircle2 className="w-5 h-5" />
           <p className="text-sm font-black">Plan updated successfully</p>
        </div>
      )}

      <h1 className="text-2xl font-black text-slate-900 mb-2">Configure Plan</h1>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest ml-1">{plan.id}</p>
      
      <form onSubmit={handleSave} className="space-y-6 mt-8">
         <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
            <div className="space-y-1.5">
               <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-1.5 block">Plan Name</label>
               <div className="relative">
                 <Tag className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                 <input 
                   type="text" 
                   value={plan.name}
                   onChange={e => setPlan({ ...plan, name: e.target.value })}
                   className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:outline-none font-bold text-slate-900 transition-all" 
                 />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-1.5 block">Price (INR)</label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="number" 
                      value={plan.price}
                      onChange={e => setPlan({ ...plan, price: parseInt(e.target.value) || 0 })}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:outline-none font-bold text-slate-900 transition-all" 
                    />
                  </div>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-1.5 block">Total Meals</label>
                  <div className="relative">
                    <Layers className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="number" 
                      value={plan.meal_count}
                      onChange={e => setPlan({ ...plan, meal_count: parseInt(e.target.value) || 0 })}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:outline-none font-bold text-slate-900 transition-all" 
                    />
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-1.5 block">Duration (Days)</label>
                  <div className="relative">
                    <CalendarClock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="number" 
                      value={plan.duration_days}
                      onChange={e => setPlan({ ...plan, duration_days: parseInt(e.target.value) || 0 })}
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:outline-none font-bold text-slate-900 transition-all" 
                    />
                  </div>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-1.5 block">Meals Per Day</label>
                  <select 
                    value={plan.meals_per_day}
                    onChange={e => setPlan({ ...plan, meals_per_day: parseInt(e.target.value) })}
                    className="w-full h-[54px] px-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:outline-none appearance-none font-bold text-slate-900"
                  >
                     <option value={1}>1 Meal / Day</option>
                     <option value={2}>2 Meals / Day</option>
                     <option value={3}>3 Meals / Day</option>
                  </select>
               </div>
            </div>
         </div>

         <div 
           onClick={() => setPlan({ ...plan, is_active: !plan.is_active })}
           className={`bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all group`}
         >
            <div>
               <h3 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">Visible to Residents</h3>
               <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Control plan availability</p>
            </div>
            <div className={`w-12 h-6 rounded-full relative shadow-inner transition-colors duration-300 ${plan.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
               <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-md transition-all duration-300 ${plan.is_active ? 'right-0.5' : 'left-0.5'}`}></div>
            </div>
         </div>
      </form>

      {/* Danger Zone */}
      <div className="border border-red-50 bg-red-50/30 rounded-[32px] p-8 mt-12 text-center">
         <h3 className="font-black text-red-700 text-xs mb-4 uppercase tracking-[0.2em]">Danger Zone</h3>
         <p className="text-red-900/40 text-[10px] font-bold leading-relaxed mb-8">
            Deactivating a plan will hide it from new residents but existing subscriptions will continue normally until they expire.
         </p>
         <button 
           onClick={handleDeactivate}
           disabled={deactivating}
           className="w-full bg-red-100 hover:bg-red-200 text-red-700 py-4 rounded-2xl font-black text-sm transition-all border border-red-200 active:scale-95 disabled:opacity-50 shadow-lg shadow-red-200/20"
         >
            {deactivating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : <><Trash2 className="w-4 h-4 inline mr-2" /> Deactivate Plan</>}
         </button>
      </div>
    </div>
  );
}
