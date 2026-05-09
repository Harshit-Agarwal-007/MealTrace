"use client";

import { useState } from "react";
import { ArrowLeft, Save, IndianRupee, Tag, CalendarClock, Loader2, AlertCircle, Layers, FileText } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";

export default function AdminPlanCreate() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    price: 0,
    meal_count: 30,
    meals_per_day: 1,
    duration_days: 30,
    description: "",
    is_active: true
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || form.price <= 0) return;
    
    setSaving(true);
    setError(null);
    try {
      await api.post("/admin/plans", form);
      router.push("/admin/plans");
    } catch (err: any) {
      setError(err.message || "Failed to create subscription plan");
      setSaving(false);
    }
  };

  return (
    <div className="p-6 pt-8 pb-32 animate-in slide-in-from-right duration-500 space-y-6 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
         <Link href="/admin/plans" className="bg-white p-3 rounded-full shadow-sm border border-slate-100 hover:bg-slate-50 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
         </Link>
         <button 
           onClick={handleSave}
           disabled={saving || !form.name || form.price <= 0}
           className="bg-indigo-600 text-white px-6 py-2.5 rounded-full text-xs font-black flex items-center gap-2 active:scale-95 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50"
         >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Creating..." : "Create Plan"}
         </button>
      </div>

      <h1 className="text-2xl font-black text-slate-900 mb-2">New Subscription</h1>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest ml-1">Define pricing and meal structure</p>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 flex items-center gap-3 animate-shake">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSave} className="space-y-6">
         <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-5">
            <div className="space-y-1.5">
               <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-1 block pl-1">Plan Display Name</label>
               <div className="relative">
                 <Tag className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                 <input 
                   type="text" 
                   required
                   value={form.name}
                   onChange={e => setForm({ ...form, name: e.target.value })}
                   placeholder="e.g. Standard Monthly (Veg)" 
                   className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:outline-none font-bold text-slate-900 transition-all" 
                 />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-1 block pl-1">Price (INR)</label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="number" 
                      required
                      value={form.price || ""}
                      onChange={e => setForm({ ...form, price: parseInt(e.target.value) || 0 })}
                      placeholder="4500" 
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:outline-none font-bold text-slate-900 transition-all" 
                    />
                  </div>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-1 block pl-1">Total Meals</label>
                  <div className="relative">
                    <Layers className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="number" 
                      required
                      value={form.meal_count || ""}
                      onChange={e => setForm({ ...form, meal_count: parseInt(e.target.value) || 0 })}
                      placeholder="30" 
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:outline-none font-bold text-slate-900 transition-all" 
                    />
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-1 block pl-1">Duration (Days)</label>
                  <div className="relative">
                    <CalendarClock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input 
                      type="number" 
                      required
                      value={form.duration_days || ""}
                      onChange={e => setForm({ ...form, duration_days: parseInt(e.target.value) || 0 })}
                      placeholder="30" 
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:outline-none font-bold text-slate-900 transition-all" 
                    />
                  </div>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-1 block pl-1">Meals Per Day</label>
                  <select 
                    value={form.meals_per_day}
                    onChange={e => setForm({ ...form, meals_per_day: parseInt(e.target.value) })}
                    className="w-full h-[54px] px-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:outline-none appearance-none font-bold text-slate-900"
                  >
                     <option value={1}>1 Meal / Day</option>
                     <option value={2}>2 Meals / Day</option>
                     <option value={3}>3 Meals / Day</option>
                  </select>
               </div>
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-1 block pl-1">Description (Optional)</label>
               <div className="relative">
                 <FileText className="w-4 h-4 text-slate-400 absolute left-4 top-4" />
                 <textarea 
                   rows={3}
                   value={form.description}
                   onChange={e => setForm({ ...form, description: e.target.value })}
                   placeholder="e.g. Recommended for 30 days of lunch sessions." 
                   className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-100 focus:outline-none font-bold text-slate-900 transition-all resize-none" 
                 />
               </div>
            </div>
         </div>

         <div className="bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-all group" onClick={() => setForm({ ...form, is_active: !form.is_active })}>
            <div>
               <h3 className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">Activate Immediately</h3>
               <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Toggle public visibility</p>
            </div>
            <div className={`w-12 h-6 rounded-full relative shadow-inner transition-colors duration-300 ${form.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}>
               <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-md transition-all duration-300 ${form.is_active ? 'right-0.5' : 'left-0.5'}`}></div>
            </div>
         </div>
      </form>
    </div>
  );
}
