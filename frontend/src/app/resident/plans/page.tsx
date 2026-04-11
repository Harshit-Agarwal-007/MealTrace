"use client";
import { ShoppingCart, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function PlansPage() {
  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500">
      <Link href="/resident" className="inline-flex items-center text-indigo-600 font-bold mb-6 hover:text-indigo-700 transition-colors">
         <ArrowLeft className="w-5 h-5 mr-2" /> Back to Dashboard
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Top Up Plan</h1>
      <p className="text-gray-500 mb-8">Purchase meals for your account.</p>
      
      <div className="space-y-4">
         <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-200">
            <h2 className="text-xl font-bold mb-1">Standard Plan (30 Days)</h2>
            <p className="text-indigo-100 text-sm mb-6">3 meals per day (Breakfast, Lunch, Dinner)</p>
            <div className="flex justify-between items-end">
               <span className="text-3xl font-black">₹4,500</span>
               <button className="bg-white text-indigo-600 px-6 py-2 rounded-xl font-bold shadow-lg active:scale-95 transition-transform flex items-center gap-2">
                 <ShoppingCart className="w-4 h-4" /> Buy
               </button>
            </div>
         </div>
      </div>
    </div>
  )
}
