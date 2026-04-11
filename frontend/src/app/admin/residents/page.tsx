"use client";
import { Search, UserPlus, FileSpreadsheet } from "lucide-react";
import Link from "next/link";

export default function AdminResidents() {
  const residents = [
    { id: 1, name: "Harshit Agarwal", phone: "+91 9876543210", plan: "Standard Plan", status: "Active" },
    { id: 2, name: "Priya Sharma", phone: "+91 9988776655", plan: "Premium Plan", status: "Active" },
    { id: 3, name: "Rahul Verma", phone: "+91 9876512345", plan: "Guest Mode", status: "Inactive" },
  ];

  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500 space-y-6">
       <div className="flex justify-between items-center">
         <h1 className="text-2xl font-bold text-slate-900">Residents</h1>
         <div className="flex gap-2">
           <button className="bg-slate-100 p-2.5 rounded-full text-slate-600 hover:bg-slate-200">
              <FileSpreadsheet className="w-4 h-4" />
           </button>
           <Link href="/admin/residents/new" className="bg-blue-600 p-2.5 rounded-full text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 block">
              <UserPlus className="w-4 h-4" />
           </Link>
         </div>
       </div>

       <div className="relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
           <input 
             type="text" 
             placeholder="Search residents..." 
             className="w-full bg-white border border-slate-200 rounded-[20px] py-3 pl-11 pr-4 text-slate-900 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-400 font-medium shadow-sm"
           />
       </div>

       <div className="bg-white border text-sm border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
         {residents.map((res, i) => (
           <Link key={res.id} href={`/admin/residents/${res.id}`} className="block">
             <div className={`p-4 flex justify-between items-center hover:bg-slate-50 transition-colors ${i !== 0 ? 'border-t border-slate-100' : ''}`}>
                <div>
                   <p className="font-bold text-slate-900">{res.name}</p>
                   <p className="text-slate-500 text-xs mt-0.5">{res.phone} • {res.plan}</p>
                </div>
                <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${res.status === 'Active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  {res.status}
                </span>
             </div>
           </Link>
         ))}
       </div>
    </div>
  )
}
