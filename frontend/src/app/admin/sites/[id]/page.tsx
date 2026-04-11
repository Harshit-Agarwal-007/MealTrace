"use client";
import { ArrowLeft, Clock, Save } from "lucide-react";
import Link from "next/link";
import { use } from "react";

export default function AdminSiteDetail({ params }: { params: Promise<{id: string}> }) {
  const { id } = use(params);

  return (
    <div className="p-6 pt-8 pb-24 animate-in fade-in duration-500 space-y-6 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-2">
         <Link href="/admin/sites" className="inline-flex items-center text-blue-600 font-bold hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Sites
         </Link>
         <button className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-md">
            <Save className="w-3.5 h-3.5" /> Save
         </button>
      </div>
      
      {/* Site Header */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-200">
         <div className="flex justify-between items-start mb-4">
            <div className="flex-1 mr-4">
               <input 
                 defaultValue={id === '1' ? "Main Cafeteria" : id === '2' ? "Hostel B Mess" : "Site Name"} 
                 className="text-2xl font-bold text-slate-900 w-full focus:outline-none border-b border-transparent focus:border-blue-500 pb-1 bg-transparent" 
               />
               <input 
                 defaultValue={id === '1' ? "MC-01" : `UID-${id}`}
                 className="text-slate-500 text-sm mt-1 focus:outline-none border-b border-transparent focus:border-blue-500 pb-1 bg-transparent uppercase" 
               />
            </div>
            {/* Status Toggle */}
            <div className="w-12 h-6 bg-emerald-500 rounded-full relative shadow-inner cursor-pointer shrink-0 mt-1.5">
               <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-md"></div>
            </div>
         </div>
      </div>

      <h2 className="text-xl font-bold text-slate-800 ml-2">Meal Windows</h2>
      
      {/* Time windows */}
      <div className="space-y-4">
         <div className="bg-white p-5 rounded-[24px] border border-blue-200 shadow-sm shadow-blue-500/5 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-500"></div>
            <div className="flex justify-between items-center mb-3 ml-2">
               <h3 className="font-bold text-slate-900 flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" /> Breakfast</h3>
               <div className="w-10 h-5 bg-blue-500 rounded-full relative cursor-pointer shadow-inner">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-3 ml-2 text-sm">
               <div>
                  <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1 block">Start Time</label>
                  <input type="time" defaultValue="07:30" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-blue-500" />
               </div>
               <div>
                  <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1 block">End Time</label>
                  <input type="time" defaultValue="10:00" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-blue-500" />
               </div>
            </div>
         </div>

         <div className="bg-white p-5 rounded-[24px] border border-orange-200 shadow-sm shadow-orange-500/5 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500"></div>
            <div className="flex justify-between items-center mb-3 ml-2">
               <h3 className="font-bold text-slate-900 flex items-center gap-2"><Clock className="w-4 h-4 text-orange-500" /> Lunch</h3>
               <div className="w-10 h-5 bg-orange-500 rounded-full relative cursor-pointer shadow-inner">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-3 ml-2 text-sm">
               <div>
                  <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1 block">Start Time</label>
                  <input type="time" defaultValue="12:30" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-orange-500" />
               </div>
               <div>
                  <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1 block">End Time</label>
                  <input type="time" defaultValue="15:00" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-orange-500" />
               </div>
            </div>
         </div>

         <div className="bg-white p-5 rounded-[24px] border border-indigo-200 shadow-sm shadow-indigo-500/5 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-500"></div>
            <div className="flex justify-between items-center mb-3 ml-2">
               <h3 className="font-bold text-slate-900 flex items-center gap-2"><Clock className="w-4 h-4 text-indigo-500" /> Dinner</h3>
               <div className="w-10 h-5 bg-indigo-500 rounded-full relative cursor-pointer shadow-inner">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm"></div>
               </div>
            </div>
            <div className="grid grid-cols-2 gap-3 ml-2 text-sm">
               <div>
                  <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1 block">Start Time</label>
                  <input type="time" defaultValue="19:30" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-indigo-500" />
               </div>
               <div>
                  <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1 block">End Time</label>
                  <input type="time" defaultValue="22:30" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-medium text-slate-800 focus:outline-none focus:border-indigo-500" />
               </div>
            </div>
         </div>
      </div>
    </div>
  )
}
