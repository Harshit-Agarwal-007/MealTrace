"use client";
import { ArrowLeft, Send } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function AdminBroadcast() {
  const [success, setSuccess] = useState(false);

  const handleSend = (e: any) => {
    e.preventDefault();
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500">
      <Link href="/admin" className="inline-flex items-center text-blue-600 font-bold mb-6 hover:text-blue-700 transition-colors">
         <ArrowLeft className="w-5 h-5 mr-2" /> Back
      </Link>
      
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Broadcast Alert</h1>
      <p className="text-slate-500 mb-8 max-w-sm text-sm">Send an immediate push notification to all Residents and Vendors.</p>

      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl font-bold text-sm mb-6 flex items-center gap-2 border border-emerald-100 animate-in slide-in-from-top-2">
            ✅ Broadcast sent successfully.
        </div>
      )}

      <form onSubmit={handleSend} className="space-y-5">
         <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm space-y-4">
             <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Title</label>
               <input 
                 type="text" 
                 required
                 placeholder="e.g. System Maintenance"
                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none" 
               />
             </div>
             
             <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Message Body</label>
               <textarea 
                 rows={4}
                 required
                 placeholder="Main Cafeteria will be closed from 2PM to 4PM..."
                 className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none" 
               />
             </div>
             
             <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Target Audience</label>
               <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none text-slate-700 font-medium">
                  <option value="ALL">All Users (Global)</option>
                  <option value="RESIDENTS">Residents Only</option>
                  <option value="VENDORS">Vendors Only</option>
               </select>
             </div>
         </div>
         
         <button className="w-full bg-blue-600 text-white p-4 rounded-2xl font-bold shadow-lg shadow-blue-500/30 flex justify-center items-center gap-2 hover:bg-blue-700 active:scale-95 transition-all">
            <Send className="w-5 h-5" /> Dispatch Alert
         </button>
      </form>
    </div>
  )
}
