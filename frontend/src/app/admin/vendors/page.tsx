"use client";

/**
 * Admin Vendors List
 *
 * GET /admin/vendors
 */

import { useState, useEffect } from "react";
import { Plus, Store, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/apiClient";

interface Vendor { id: string; user_id: string; assigned_site_ids: string[]; }

export default function AdminVendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ vendors: Vendor[] }>("/admin/vendors")
       .then(res => setVendors(res.vendors || []))
       .catch(() => {})
       .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 pt-8 pb-28 animate-in fade-in duration-500 space-y-6">
       <div className="flex justify-between items-center">
         <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
         <Link href="/admin/vendors/new" className="bg-orange-500 p-2.5 rounded-full text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 block">
            <Plus className="w-4 h-4" />
         </Link>
       </div>

       <div className="bg-white border text-sm border-slate-200 rounded-[24px] overflow-hidden shadow-sm min-h-[50vh]">
         {loading ? (
             <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-orange-500"/></div>
         ) : vendors.length === 0 ? (
             <div className="p-8 text-center text-slate-400 font-medium">No vendors onboarded.</div>
         ) : (
             vendors.map((v, i) => (
               <Link key={v.id} href={`/admin/vendors/${v.id}`} className="block group">
                 <div className={`p-4 flex justify-between items-center hover:bg-slate-50 transition-colors ${i !== 0 ? 'border-t border-slate-100' : ''}`}>
                    <div className="flex items-center gap-4">
                       <div className="bg-orange-50 p-2.5 rounded-xl text-orange-500">
                          <Store className="w-5 h-5"/>
                       </div>
                       <div>
                          <p className="font-bold text-slate-900">{v.user_id}</p>
                          <p className="text-slate-500 text-[10px] uppercase font-bold mt-0.5">{v.assigned_site_ids.length} Assigned Sites</p>
                       </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500" />
                 </div>
               </Link>
             ))
         )}
       </div>
    </div>
  )
}
