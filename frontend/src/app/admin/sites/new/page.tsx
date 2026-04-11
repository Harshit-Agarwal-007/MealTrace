"use client";
import { ArrowLeft, Save, MapPin, Code } from "lucide-react";
import Link from "next/link";

export default function AdminSiteCreate() {
  return (
    <div className="p-6 pt-8 pb-24 animate-in slide-in-from-right duration-500 space-y-6 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
         <Link href="/admin/sites" className="inline-flex items-center text-blue-600 font-bold hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Sites
         </Link>
         <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-md">
            <Save className="w-4 h-4" /> Create Site
         </button>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Create New Site</h1>
      
      <form className="space-y-4">
         <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm space-y-4">
            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Site Display Name</label>
               <div className="relative">
                 <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <input type="text" placeholder="Coffee Shop A" className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none" />
               </div>
            </div>

            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Internal Location Code</label>
               <div className="relative">
                 <Code className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <input type="text" placeholder="CS-04" className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none uppercase" />
               </div>
            </div>
         </div>

         <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors">
            <div>
               <h3 className="font-bold text-slate-900">Initialize Active</h3>
               <p className="text-slate-500 text-xs mt-0.5">Start accepting scans immediately</p>
            </div>
            <div className="w-12 h-6 bg-emerald-500 rounded-full relative shadow-inner">
               <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-md"></div>
            </div>
         </div>
      </form>
    </div>
  )
}
