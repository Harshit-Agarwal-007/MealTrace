"use client";
import { ArrowLeft, Save, IndianRupee, Tag, CalendarClock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function AdminPlanCreate() {
  const [isLive, setIsLive] = useState(true);

  return (
    <div className="p-6 pt-8 pb-24 animate-in slide-in-from-right duration-500 space-y-6 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
         <Link href="/admin/plans" className="inline-flex items-center text-blue-600 font-bold hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Plans
         </Link>
         <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-md shadow-blue-500/20">
            <Save className="w-4 h-4" /> Create Plan
         </button>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Create Subscription Plan</h1>
      
      <form className="space-y-4">
         <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm space-y-4">
            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Plan Name</label>
               <div className="relative">
                 <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <input type="text" placeholder="Ultra Premium Plan" className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none font-bold" />
               </div>
            </div>

            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Price (INR)</label>
               <div className="relative">
                 <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <input type="number" placeholder="8500" className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none" />
               </div>
            </div>

            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Duration</label>
               <div className="relative">
                 <CalendarClock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <select className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none appearance-none">
                    <option>30 Days (Monthly)</option>
                    <option>7 Days (Weekly)</option>
                    <option>24 Hours (Guest Pass)</option>
                 </select>
               </div>
            </div>
         </div>

         <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => setIsLive(!isLive)}>
            <div>
               <h3 className="font-bold text-slate-900">Make Live Immediately</h3>
               <p className="text-slate-500 text-xs mt-0.5">Allow users to purchase this from the app</p>
            </div>
            <div className={`w-12 h-6 rounded-full relative shadow-inner transition-colors ${isLive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
               <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-md transition-all ${isLive ? 'right-0.5' : 'left-0.5'}`}></div>
            </div>
         </div>
      </form>
    </div>
  )
}
