"use client";

import { useAuth } from "@/context/AuthContext";
import { User, Settings, LogOut, ShieldAlert, Leaf, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function ResidentProfile() {
  const { logout } = useAuth();
  const [diet, setDiet] = useState('veg');
  
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-white mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col items-center justify-center space-y-4">
         <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center shadow-inner border border-indigo-50">
            <User className="w-10 h-10 text-indigo-400" />
         </div>
         <div className="text-center">
            <h2 className="text-xl font-bold text-gray-900">Harshit Agarwal</h2>
            <p className="text-gray-500 text-sm mt-0.5">harshit@example.com</p>
         </div>
         <span className="bg-indigo-50 text-indigo-600 font-bold px-4 py-1.5 rounded-full text-xs border border-indigo-100">
           Room 204 • Block B
         </span>
      </div>

      <div className="space-y-3">
         <Link href="/resident/settings" className="w-full bg-white p-4 rounded-2xl flex items-center justify-between text-gray-700 shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3">
               <Settings className="text-gray-400 w-5 h-5"/>
               <span className="font-semibold text-sm">Account Settings</span>
            </div>
         </Link>
         <button className="w-full bg-white p-4 rounded-2xl flex items-center justify-between text-gray-700 shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3">
               <ShieldAlert className="text-gray-400 w-5 h-5"/>
               <span className="font-semibold text-sm">Help & Support</span>
            </div>
         </button>
      </div>

      <div className="mt-8 space-y-3">
         <h3 className="font-bold text-gray-900 ml-1 mb-4 flex items-center gap-2">
            <Leaf className="w-5 h-5 text-emerald-500" /> Dietary Preference
         </h3>
         
         <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-2 gap-2">
            <button 
              onClick={() => setDiet('veg')}
              className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${diet === 'veg' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            >
               {diet === 'veg' && <Check className="w-4 h-4" />} Vegetarian
            </button>
            <button 
              onClick={() => setDiet('non-veg')}
              className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${diet === 'non-veg' ? 'bg-red-50 text-red-700 border border-red-200 shadow-sm' : 'text-gray-500 hover:bg-gray-50'}`}
            >
               {diet === 'non-veg' && <Check className="w-4 h-4" />} Non-Veg
            </button>
         </div>
      </div>   <button onClick={logout} className="w-full bg-red-50 p-4 rounded-2xl flex items-center justify-between text-red-600 shadow-sm border border-red-100 hover:bg-red-100 active:scale-[0.98] transition-all mt-4">
            <div className="flex items-center gap-3">
               <LogOut className="text-red-500 w-5 h-5"/>
               <span className="font-bold text-sm">Log Out</span>
            </div>
         </button>
    </div>
  );
}
