"use client";

/**
 * Admin Sites List
 *
 * GET /sites
 */

import { useState, useEffect } from "react";
import { Plus, MapPin, Loader2, ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/apiClient";

interface Site { id: string; name: string; is_active: boolean; }

export default function AdminSites() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ sites: Site[] }>("/sites")
       .then(res => setSites(res.sites || []))
       .catch(() => {})
       .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 pt-8 pb-28 animate-in fade-in duration-500 space-y-6">
       <div className="flex justify-between items-center">
         <h1 className="text-2xl font-bold text-slate-900">Assigned Sites</h1>
         <Link href="/admin/sites/new" className="bg-indigo-600 p-2.5 rounded-full text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 block">
            <Plus className="w-4 h-4" />
         </Link>
       </div>

       <div className="bg-white border text-sm border-slate-200 rounded-[24px] overflow-hidden shadow-sm min-h-[50vh]">
         {loading ? (
             <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-500"/></div>
         ) : sites.length === 0 ? (
             <div className="p-8 text-center text-slate-400 font-medium">No sites set up.</div>
         ) : (
             sites.map((site, i) => (
               <div
                 key={site.id}
                 className={`flex items-stretch justify-between gap-2 hover:bg-slate-50 transition-colors ${i !== 0 ? "border-t border-slate-100" : ""}`}
               >
                 <Link href={`/admin/sites/${site.id}`} className="group flex min-w-0 flex-1 items-center gap-4 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900">{site.name}</p>
                      <p className="mt-0.5 font-mono text-[10px] text-slate-500">{site.id}</p>
                    </div>
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full self-start ${site.is_active ? "bg-emerald-500" : "bg-red-400"}`} />
                    <ChevronRight className="h-4 w-4 shrink-0 self-center text-slate-300 group-hover:text-indigo-500" />
                 </Link>
                 <Link
                   href={`/admin/sites/${site.id}/roster`}
                   className="flex shrink-0 flex-col items-center justify-center border-l border-slate-100 px-3 py-2 text-[10px] font-black uppercase tracking-wide text-indigo-600 hover:bg-indigo-50"
                 >
                   <Users className="mb-0.5 h-4 w-4" />
                   Roster
                 </Link>
               </div>
             ))
         )}
       </div>
    </div>
  )
}
