"use client";
import { Plus, Search, Store } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function AdminVendors() {
  const [vendors] = useState([
    { id: "1", name: "Vendor Kiosk 1", email: "vendor1@mealtrace.com", site: "Main Cafeteria", status: "Active" },
    { id: "2", name: "Vendor Kiosk 2", email: "vendor2@mealtrace.com", site: "Hostel B Mess", status: "Active" },
    { id: "3", name: "Backup Scanner", email: "backup@mealtrace.com", site: "Unassigned", status: "Offline" },
  ]);

  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500 space-y-6">
       <div className="flex justify-between items-center">
         <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
         <button className="bg-blue-600 p-2.5 rounded-full text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-transform active:scale-95">
            <Plus className="w-5 h-5" />
         </button>
       </div>

       <div className="relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
           <input 
             type="text" 
             placeholder="Search vendors..." 
             className="w-full bg-white border border-slate-200 rounded-[20px] py-3 pl-11 pr-4 text-slate-900 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-400 font-medium shadow-sm"
           />
       </div>

       <div className="space-y-4">
         {vendors.map((vendor) => (
           <Link key={vendor.id} href={`/admin/vendors/${vendor.id}`} className="block">
             <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm hover:shadow-md transition-all group flex justify-between items-center">
                <div className="flex items-center gap-4">
                   <div className={`p-3 rounded-full ${vendor.status === 'Active' ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-100' : 'bg-slate-100 text-slate-500'} transition-colors`}>
                      <Store className="w-5 h-5" />
                   </div>
                   <div>
                      <h3 className="font-bold text-slate-900">{vendor.name}</h3>
                      <p className="text-slate-500 text-xs mt-0.5">{vendor.email} • {vendor.site}</p>
                   </div>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${vendor.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                   {vendor.status}
                </span>
             </div>
           </Link>
         ))}
       </div>
    </div>
  )
}
