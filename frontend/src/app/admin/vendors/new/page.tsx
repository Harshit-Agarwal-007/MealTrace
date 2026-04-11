"use client";
import { ArrowLeft, Save, Store, Mail, MapPin } from "lucide-react";
import Link from "next/link";

export default function AdminVendorCreate() {
  return (
    <div className="p-6 pt-8 pb-24 animate-in slide-in-from-right duration-500 space-y-6 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
         <Link href="/admin/vendors" className="inline-flex items-center text-blue-600 font-bold hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Vendors
         </Link>
         <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-md shadow-blue-500/20">
            <Save className="w-4 h-4" /> Provision Vendor
         </button>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Provision Vendor Device</h1>
      
      <form className="space-y-4">
         <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm space-y-4">
            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Vendor Terminal Name</label>
               <div className="relative">
                 <Store className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <input type="text" placeholder="Vendor Kiosk 3" className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none" />
               </div>
            </div>

            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Login Email</label>
               <div className="relative">
                 <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <input type="email" placeholder="vendor3@mealtrace.com" className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none" />
               </div>
            </div>
            
            <p className="text-xs text-slate-400 italic">A temporary password will be emailed to this address for the initial setup.</p>
         </div>

         <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm space-y-4">
            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Initial Site Assignment</label>
               <div className="relative">
                 <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <select className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none font-medium appearance-none">
                    <option>Main Cafeteria (MC-01)</option>
                    <option>Hostel B Mess (HB-02)</option>
                    <option>Admin Block Snacks (AB-03)</option>
                    <option>Unassigned (Pool Room)</option>
                 </select>
               </div>
            </div>
         </div>
      </form>
    </div>
  )
}
