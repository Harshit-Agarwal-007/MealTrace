"use client";
import { ArrowLeft, Bell, Key } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500">
      <Link href="/resident/profile" className="inline-flex items-center text-indigo-600 font-bold mb-6 hover:text-indigo-700 transition-colors">
         <ArrowLeft className="w-5 h-5 mr-2" /> Back to Profile
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Account Settings</h1>
      
      <div className="space-y-4">
         <div className="bg-white p-5 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm">
            <div className="flex items-center gap-4">
               <Bell className="text-gray-400 w-5 h-5" />
               <span className="font-semibold text-gray-700">Push Notifications</span>
            </div>
            <div className="w-12 h-6 bg-indigo-600 rounded-full relative cursor-pointer">
               <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-md"></div>
            </div>
         </div>
         
         <div className="bg-white p-5 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm cursor-pointer hover:bg-gray-50">
            <div className="flex items-center gap-4">
               <Key className="text-gray-400 w-5 h-5" />
               <span className="font-semibold text-gray-700">Change Password</span>
            </div>
         </div>
      </div>
    </div>
  )
}
