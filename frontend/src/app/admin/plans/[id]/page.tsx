"use client";
import { ArrowLeft, Save, IndianRupee, Tag, CalendarClock, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState, use } from "react";

export default function AdminPlanEdit({ params }: { params: Promise<{id:string}> }) {
  const { id } = use(params);
  const [isLive, setIsLive] = useState(true);
  const [toast, setToast] = useState(false);

  const handleSave = (e: any) => {
     e.preventDefault();
     setToast(true);
     setTimeout(() => setToast(false), 3000);
  };

  return (
    <div className="p-6 pt-8 pb-24 animate-in slide-in-from-right duration-500 space-y-6 max-w-lg mx-auto">
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-in slide-in-from-top-10 fade-in zoom-in duration-300">
           ✅ <span className="font-bold text-sm">Plan settings saved</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
         <Link href="/admin/plans" className="inline-flex items-center text-blue-600 font-bold hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Plans
         </Link>
         <button onClick={handleSave} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-md">
            <Save className="w-4 h-4" /> Save Changes
         </button>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Edit Subscription Plan</h1>
      
      <form onSubmit={handleSave} className="space-y-4">
         <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm space-y-4">
            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Plan Name</label>
               <div className="relative">
                 <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <input type="text" defaultValue={id === '1' ? 'Standard Plan' : id === '2' ? 'Premium Plan' : 'Custom Plan'} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none font-bold" />
               </div>
            </div>

            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Price (INR)</label>
               <div className="relative">
                 <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <input type="number" defaultValue={id === '1' ? '4500' : '6000'} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none" />
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
               <h3 className="font-bold text-slate-900">Live Status</h3>
               <p className="text-slate-500 text-xs mt-0.5">Is currently active on the main app</p>
            </div>
            <div className={`w-12 h-6 rounded-full relative shadow-inner transition-colors ${isLive ? 'bg-emerald-500' : 'bg-slate-300'}`}>
               <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-md transition-all ${isLive ? 'right-0.5' : 'left-0.5'}`}></div>
            </div>
         </div>
      </form>

      {/* Danger Zone */}
      <div className="border border-red-200 bg-red-50 rounded-[24px] p-5 mt-8">
         <h3 className="font-bold text-red-700 text-sm mb-3">Danger Zone</h3>
         <button className="w-full bg-red-100 hover:bg-red-200 text-red-700 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 border border-red-200">
            <Trash2 className="w-4 h-4" /> Delete Plan
         </button>
      </div>
    </div>
  )
}
