"use client";
import { ArrowLeft, Plus, Settings } from "lucide-react";
import Link from "next/link";

export default function AdminPlans() {
  const plans = [
    { id: 1, name: "Standard Plan", price: "₹4,500", duration: "30 Days", status: "Active" },
    { id: 2, name: "Premium Plan", price: "₹6,000", duration: "30 Days", status: "Active" },
    { id: 3, name: "Guest Pass (Single)", price: "₹250", duration: "24 Hours", status: "Active" },
  ];

  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500 space-y-6">
      <div className="flex justify-between items-center mb-2">
         <Link href="/admin" className="inline-flex items-center text-blue-600 font-bold hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
         </Link>
         <Link href="/admin/plans/new" className="bg-blue-600 p-2.5 rounded-full text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-transform active:scale-95 block">
            <Plus className="w-5 h-5" />
         </Link>
      </div>

      <h1 className="text-2xl font-bold text-slate-900">Plans Catalog</h1>
      <p className="text-slate-500 mb-6">Manage user subscription offerings.</p>

      <div className="grid gap-4">
        {plans.map((plan) => (
           <div key={plan.id} className="bg-gradient-to-br from-white to-slate-50 p-6 rounded-[24px] border border-slate-200 shadow-sm relative overflow-hidden group">
              <div className="flex justify-between items-start mb-4">
                 <div>
                    <h3 className="font-bold text-lg text-slate-900">{plan.name}</h3>
                    <p className="text-blue-600 font-black text-xl mt-1">{plan.price}</p>
                 </div>
                 <Link href={`/admin/plans/${plan.id}`} className="p-2 text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Settings className="w-5 h-5" />
                 </Link>
              </div>
              <div className="flex gap-2 text-xs font-bold uppercase tracking-wider">
                 <span className="bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg">{plan.duration}</span>
                 <span className="bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg">{plan.status}</span>
              </div>
           </div>
        ))}
      </div>
    </div>
  )
}
