"use client";
import { ArrowLeft, Bell, Key, Save, User, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function SettingsPage() {
  const [toast, setToast] = useState(false);

  const handleSave = (e: any) => {
    e.preventDefault();
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500 pb-24 relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-in slide-in-from-top-10 fade-in zoom-in duration-300">
           ✅ <span className="font-bold text-sm">Profile updated</span>
        </div>
      )}

      <Link href="/resident/profile" className="inline-flex items-center text-indigo-600 font-bold mb-6 hover:text-indigo-700 transition-colors">
         <ArrowLeft className="w-5 h-5 mr-2" /> Back to Profile
      </Link>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Profile & Settings</h1>
        <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-md shadow-indigo-500/30">
          <Save className="w-4 h-4" /> Save
        </button>
      </div>
      
      <form onSubmit={handleSave} className="space-y-6">
         <div className="bg-white p-5 rounded-[24px] border border-gray-100 shadow-sm space-y-4 relative">
            <h2 className="text-sm font-bold text-gray-900 mb-2">Personal Details</h2>
            
            <div>
               <label className="text-xs text-gray-500 font-bold tracking-wider uppercase mb-1.5 block">Full Name</label>
               <div className="relative">
                 <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                 <input type="text" defaultValue="Harshit Agarwal" className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none" />
               </div>
            </div>

            <div>
               <label className="text-xs text-gray-500 font-bold tracking-wider uppercase mb-1.5 block">Email Address</label>
               <div className="relative">
                 <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                 <input type="email" defaultValue="harshit@example.com" className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none" />
               </div>
            </div>

            <div>
               <label className="text-xs text-gray-500 font-bold tracking-wider uppercase mb-1.5 block">Phone Number</label>
               <div className="relative">
                 <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                 <input type="tel" defaultValue="+91 9876543210" className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 focus:outline-none" />
               </div>
            </div>
         </div>

         <div className="space-y-4">
            <h2 className="text-sm font-bold text-gray-900 mb-2 ml-1">App Settings</h2>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm">
               <div className="flex items-center gap-4">
                  <Bell className="text-gray-400 w-5 h-5" />
                  <span className="font-semibold text-gray-700">Push Notifications</span>
               </div>
               <div className="w-12 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
                  <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-md"></div>
               </div>
            </div>
            
            <Link href="/forgot-password" className="bg-white p-5 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm cursor-pointer hover:bg-gray-50 transition-colors block w-full">
               <div className="flex items-center gap-4">
                  <Key className="text-gray-400 w-5 h-5" />
                  <span className="font-semibold text-gray-700">Change Password</span>
               </div>
            </Link>
         </div>
      </form>
    </div>
  )
}
