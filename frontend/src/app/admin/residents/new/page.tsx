"use client";
import { ArrowLeft, Save, User, Mail, Phone, Home } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function AdminResidentCreate() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="p-6 pt-8 pb-24 animate-in slide-in-from-right duration-500 space-y-6 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
         <Link href="/admin/residents" className="inline-flex items-center text-blue-600 font-bold hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Residents
         </Link>
         <button className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-md shadow-blue-500/20">
            <Save className="w-4 h-4" /> Create User
         </button>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Add New Resident</h1>
      
      <form className="space-y-4">
         <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm space-y-4">
            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Full Name</label>
               <div className="relative">
                 <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <input type="text" placeholder="John Doe" className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none" />
               </div>
            </div>

            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Email Address</label>
               <div className="relative">
                 <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <input type="email" placeholder="john@example.com" className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none" />
               </div>
            </div>

            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Phone Number</label>
               <div className="relative">
                 <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <input type="tel" placeholder="+91 9999999999" className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none" />
               </div>
            </div>

            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Room / Site Identifier</label>
               <div className="relative">
                 <Home className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <input type="text" placeholder="Room 404 B" className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none" />
               </div>
            </div>
         </div>

         <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm space-y-4">
            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Initial Plan</label>
               <select className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none font-medium">
                  <option>Standard Plan (₹4,500/mo)</option>
                  <option>Premium Plan (₹6,000/mo)</option>
                  <option>Pay As You Go</option>
               </select>
            </div>
         </div>
      </form>
    </div>
  )
}
