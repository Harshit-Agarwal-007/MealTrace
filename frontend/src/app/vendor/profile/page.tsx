"use client";
import { useAuth } from "@/context/AuthContext";
import { ArrowLeft, UserCircle, LogOut } from "lucide-react";
import Link from "next/link";

export default function VendorProfile() {
  const { logout } = useAuth();

  return (
    <div className="p-6 pt-12 animate-in fade-in duration-500 h-full flex flex-col">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>
      
      <div className="bg-neutral-800/80 p-6 rounded-[32px] border border-neutral-700/50 shadow-2xl flex flex-col items-center justify-center space-y-4 flex-1 max-h-64">
         <div className="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center border border-amber-500/30">
            <UserCircle className="w-12 h-12 text-amber-500" />
         </div>
         <div className="text-center">
            <h2 className="text-2xl font-bold text-white">Vendor Kiosk 1</h2>
            <p className="text-neutral-400 text-sm mt-1">vendor1@mealtrace.com</p>
         </div>
      </div>

      <div className="mt-8 space-y-4">
         <div className="bg-neutral-800/50 p-5 rounded-2xl border border-neutral-700/50 flex justify-between items-center">
            <span className="font-semibold text-neutral-300">Default Site</span>
            <span className="text-amber-500 font-bold uppercase text-xs tracking-wider">Main Cafeteria</span>
         </div>
         
         <button onClick={logout} className="w-full bg-red-500/10 border border-red-500/20 mt-4 p-5 rounded-2xl flex items-center justify-between text-red-500 hover:bg-red-500/20 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3">
               <LogOut className="text-red-500 w-5 h-5"/>
               <span className="font-bold text-sm">Log Out Session</span>
            </div>
         </button>
      </div>
    </div>
  )
}
