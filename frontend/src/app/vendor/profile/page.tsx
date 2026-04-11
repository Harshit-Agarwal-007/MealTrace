"use client";
import { useAuth } from "@/context/AuthContext";
import { UserCircle, LogOut, Save, Mail, User, Key } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function VendorProfile() {
  const { logout } = useAuth();
  const [toast, setToast] = useState(false);

  const handleSave = (e: any) => {
    e.preventDefault();
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  return (
    <div className="p-6 pt-12 animate-in fade-in duration-500 h-[100dvh] overflow-y-auto pb-32 relative text-white">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 bg-amber-500 text-neutral-950 px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-in slide-in-from-top-10 fade-in zoom-in duration-300">
           ✅ <span className="font-bold text-sm">Vendor Profile Saved</span>
        </div>
      )}

      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Device Profile</h1>
        <button onClick={handleSave} className="bg-amber-500 text-neutral-950 px-5 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 active:scale-95 transition-transform shadow-lg shadow-amber-500/20">
          <Save className="w-4 h-4" /> Save
        </button>
      </div>
      
      <div className="bg-neutral-800/80 p-6 rounded-[32px] border border-neutral-700/50 shadow-xl flex flex-col items-center justify-center space-y-4 mb-8">
         <div className="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/30">
            <UserCircle className="w-10 h-10 text-amber-500" />
         </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
         {/* Edit Details */}
         <div className="bg-neutral-800/50 p-5 rounded-[24px] border border-neutral-700/50 shadow-sm space-y-4 relative">
            <h2 className="text-sm font-bold text-neutral-300 mb-2">Device Details</h2>
            
            <div>
               <label className="text-xs text-neutral-500 font-bold tracking-wider uppercase mb-1.5 block">Kiosk Name</label>
               <div className="relative">
                 <User className="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
                 <input type="text" defaultValue="Vendor Kiosk 1" className="w-full pl-9 pr-3 py-3 bg-neutral-900 border border-neutral-700 rounded-xl focus:border-amber-500 focus:outline-none text-white font-medium" />
               </div>
            </div>

            <div>
               <label className="text-xs text-neutral-500 font-bold tracking-wider uppercase mb-1.5 block">Contact Email</label>
               <div className="relative">
                 <Mail className="w-4 h-4 text-neutral-500 absolute left-3 top-3.5" />
                 <input type="email" defaultValue="vendor1@mealtrace.com" className="w-full pl-9 pr-3 py-3 bg-neutral-900 border border-neutral-700 rounded-xl focus:border-amber-500 focus:outline-none text-white font-medium" />
               </div>
            </div>
         </div>

         {/* Settings & Auth */}
         <div className="space-y-3">
             <div className="bg-neutral-800/50 p-5 rounded-2xl border border-neutral-700/50 flex justify-between items-center">
                <span className="font-semibold text-neutral-300">Default Site</span>
                <span className="text-amber-500 font-bold uppercase text-[10px] bg-neutral-900 px-3 py-1.5 rounded-full border border-neutral-700 tracking-wider">Main Cafeteria</span>
             </div>

             <Link href="/forgot-password" className="w-full bg-neutral-800/50 p-5 rounded-2xl border border-neutral-700/50 flex justify-between items-center hover:bg-neutral-700/50 transition-colors block">
               <div className="flex items-center gap-4">
                  <Key className="text-neutral-400 w-5 h-5" />
                  <span className="font-semibold text-neutral-300">Change Password</span>
               </div>
             </Link>
             
             <button onClick={logout} className="w-full bg-red-500/10 border border-red-500/20 p-5 rounded-2xl flex items-center justify-between text-red-500 hover:bg-red-500/20 active:scale-[0.98] transition-all">
                <div className="flex items-center gap-3">
                   <LogOut className="text-red-500 w-5 h-5"/>
                   <span className="font-bold text-sm">Log Out Session</span>
                </div>
             </button>
         </div>
      </form>
    </div>
  )
}
