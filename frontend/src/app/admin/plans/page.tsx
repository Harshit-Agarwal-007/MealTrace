"use client";

/**
 * Admin Plans List
 *
 * GET /admin/plans
 */

import { useState, useEffect } from "react";
import { Plus, Database, Loader2, IndianRupee } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import type { PlanInfo } from "@/lib/types";

export default function AdminPlans() {
  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PlanInfo[]>("/admin/plans")
       .then((res) => setPlans(res || []))
       .catch(() => {})
       .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 pt-8 pb-28 animate-in fade-in duration-500 space-y-6">
       <div className="flex justify-between items-center">
         <h1 className="text-2xl font-bold text-slate-900">Meal Plans</h1>
         <Link href="/admin/plans/new" className="bg-purple-600 p-2.5 rounded-full text-white shadow-lg shadow-purple-500/30 hover:bg-purple-700 block">
            <Plus className="w-4 h-4" />
         </Link>
       </div>

       <div className="bg-white border text-sm border-slate-200 rounded-[24px] overflow-hidden shadow-sm min-h-[50vh]">
         {loading ? (
             <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-purple-500"/></div>
         ) : plans.length === 0 ? (
             <div className="p-8 text-center text-slate-400 font-medium">No plans created.</div>
         ) : (
             plans.map((p, i) => (
               <Link key={p.id} href={`/admin/plans/${p.id}`} className="block group">
                 <div className={`p-4 flex justify-between items-center hover:bg-slate-50 transition-colors cursor-pointer ${i !== 0 ? 'border-t border-slate-100' : ''}`}>
                    <div className="flex items-center gap-4">
                       <div className="bg-purple-50 p-2.5 rounded-xl text-purple-600">
                          <Database className="w-5 h-5"/>
                       </div>
                       <div>
                          <p className="font-bold text-slate-900">{p.name}</p>
                          <p className="text-slate-500 text-[10px] mt-0.5 uppercase tracking-wider">{p.meals_per_day} meals/d • {p.duration_days} days</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="font-black text-slate-800 flex items-center justify-end gap-0.5">
                         <IndianRupee className="w-3 h-3 text-slate-400" /> {p.price}
                       </p>
                       <span className={`text-[9px] font-bold uppercase mt-0.5 inline-block ${p.is_active ? 'text-emerald-500' : 'text-slate-400'}`}>{p.is_active ? 'Active' : 'Disabled'}</span>
                    </div>
                 </div>
               </Link>
             ))
         )}
       </div>
    </div>
  )
}
