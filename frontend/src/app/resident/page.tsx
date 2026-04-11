"use client";

import { useAuth } from "@/context/AuthContext";
import { QrCode, CreditCard, PlusCircle, Maximize, Bell } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function ResidentDashboard() {
  const { user } = useAuth() as any;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500 pb-24 relative">
      {/* Fullscreen QR Modal */}
      {expanded && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-200">
           <h2 className="text-2xl font-bold mb-8">Scan to Eat</h2>
           <div className="w-72 h-72 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl flex items-center justify-center border-4 border-indigo-100 shadow-2xl mb-12">
              <QrCode className="w-48 h-48 text-indigo-900" />
           </div>
           <button 
             onClick={() => setExpanded(false)}
             className="bg-slate-100 text-slate-600 font-bold px-8 py-3 rounded-full hover:bg-slate-200"
           >
              Close
           </button>
        </div>
      )}

       {/* Header */}
       <div className="flex justify-between items-center text-white mb-8">
         <div>
           <p className="text-indigo-100 text-sm font-medium">Hello,</p>
           <h1 className="text-2xl font-bold">Harshit Agarwal</h1>
         </div>
         <button className="bg-white/10 p-2.5 rounded-full hover:bg-white/20 transition-colors active:scale-95">
            <Bell className="w-5 h-5 text-white" />
         </button>
       </div>

       {/* Balance Card */}
       <div className="bg-white/90 backdrop-blur-md rounded-[32px] p-7 shadow-2xl shadow-indigo-500/10 border border-white/50 flex flex-col justify-between relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-70 group-hover:scale-110 transition-transform duration-700"></div>
         <p className="text-gray-500 font-semibold text-sm flex items-center gap-2"><CreditCard className="w-4 h-4 text-indigo-400"/> meal credits</p>
         <h2 className="text-6xl font-black text-gray-900 mt-2 mb-2 z-10 tracking-tight">42</h2>
         <p className="text-indigo-700 text-xs font-bold bg-indigo-50/80 backdrop-blur-sm w-max px-4 py-1.5 rounded-full mt-2 border border-indigo-100/50">Standard Plan • Valid till Oct 1</p>
       </div>

       {/* QR Code Section */}
       <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-gray-200/50 flex flex-col items-center justify-center space-y-5 border border-gray-100 mt-4">
          <button 
            onClick={() => setExpanded(true)} 
            className="absolute top-4 right-4 text-gray-400 hover:text-indigo-600 bg-gray-50 p-2 rounded-full transition-colors focus:outline-none"
          >
            <Maximize className="w-5 h-5" />
          </button>
          <p className="text-gray-500 font-medium tracking-wide text-sm">Scan at the counter</p>
          <div className="bg-white p-5 rounded-[2.5rem] shadow-[inset_0_-4px_10px_rgba(0,0,0,0.02),0_10px_30px_rgba(0,0,0,0.05)] relative group cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95">
             <QrCode className="w-44 h-44 text-slate-800 drop-shadow-sm group-hover:text-indigo-600 transition-colors duration-300" strokeWidth={1} />
             <div className="absolute inset-0 bg-indigo-600/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] flex items-center justify-center">
                 <Maximize className="text-indigo-600 w-10 h-10 drop-shadow-lg" />
             </div>
          </div>
          <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest bg-indigo-50/50 py-1.5 px-4 rounded-full">
            Tap to expand
          </p>
       </div>

       {/* Quick Actions */}
       <div className="grid grid-cols-2 gap-4">
         <Link href="/resident/plans" className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-[24px] p-5 flex flex-col items-center gap-3 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-1 transition-all active:scale-95">
           <PlusCircle className="w-7 h-7 opacity-90" />
           <span className="font-bold text-sm">Top Up Plan</span>
         </Link>
         <Link href="/resident/guest-pass" className="bg-white text-indigo-600 border border-indigo-50 rounded-[24px] p-5 flex flex-col items-center gap-3 shadow-lg shadow-gray-100/80 hover:shadow-gray-200 hover:-translate-y-1 transition-all active:scale-95">
           <CreditCard className="w-7 h-7 opacity-90" />
           <span className="font-bold text-sm">Guest Pass</span>
         </Link>
       </div>
    </div>
  );
}
