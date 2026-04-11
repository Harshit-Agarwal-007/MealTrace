"use client";
import { Plus, Search, MapPin, Power } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function AdminSites() {
  const [sites, setSites] = useState([
    { id: "1", name: "Main Cafeteria", code: "MC-01", status: "Active", windows: "3 Active" },
    { id: "2", name: "Hostel B Mess", code: "HB-02", status: "Active", windows: "3 Active" },
    { id: "3", name: "Admin Block Snacks", code: "AB-03", status: "Inactive", windows: "0 Active" },
  ]);

  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500 space-y-6">
       <div className="flex justify-between items-center">
         <h1 className="text-2xl font-bold text-slate-900">Meal Sites</h1>
         <Link href="/admin/sites/new" className="bg-blue-600 p-2.5 rounded-full text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-transform active:scale-95 block">
            <Plus className="w-5 h-5" />
         </Link>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
         {sites.map((site) => (
           <Link key={site.id} href={`/admin/sites/${site.id}`}>
             <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md transition-shadow group flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <div className={`p-4 rounded-full ${site.status === 'Active' ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-100' : 'bg-slate-100 text-slate-500'} transition-colors`}>
                      <MapPin className="w-6 h-6" />
                   </div>
                   <div>
                      <h3 className="font-bold text-slate-900 text-lg">{site.name}</h3>
                      <p className="text-slate-500 text-xs mt-0.5">{site.code} • {site.windows}</p>
                   </div>
                </div>
                <div className={`p-2 rounded-full ${site.status === 'Active' ? 'text-emerald-500 bg-emerald-50' : 'text-slate-400 bg-slate-100'}`}>
                   <Power className="w-5 h-5" />
                </div>
             </div>
           </Link>
         ))}
       </div>
    </div>
  )
}
