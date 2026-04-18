"use client";

/**
 * Admin Sites List
 *
 * GET /sites
 */

import { useState, useEffect } from "react";
import { Plus, MapPin, Loader2, ChevronRight } from "lucide-react";
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
               <Link key={site.id} href={`/admin/sites/${site.id}`} className="block group">
                 <div className={`p-4 flex justify-between items-center hover:bg-slate-50 transition-colors ${i !== 0 ? 'border-t border-slate-100' : ''}`}>
                    <div className="flex items-center gap-4">
                       <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600">
                          <MapPin className="w-5 h-5"/>
                       </div>
                       <div>
                          <p className="font-bold text-slate-900">{site.name}</p>
                          <p className="text-slate-500 font-mono text-[10px] mt-0.5">{site.id}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <span className={`w-2 h-2 rounded-full ${site.is_active ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
                       <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500" />
                    </div>
                 </div>
               </Link>
             ))
         )}
       </div>
    </div>
  )
}
