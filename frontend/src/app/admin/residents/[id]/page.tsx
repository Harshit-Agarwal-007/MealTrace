"use client";
import { ArrowLeft, Save, ArrowUpCircle, ArrowDownCircle, Trash2, History, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

export default function AdminResidentDetail({ params }: { params: Promise<{id: string}> }) {
  const { id } = use(params);
  const [balance, setBalance] = useState(42);
  const [toast, setToast] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const mockHistory = [
    { id: 1, site: "Main Cafeteria", type: "Lunch", status: "SUCCESS", time: "Today, 1:05 PM" },
    { id: 2, site: "Hostel B Mess", type: "Dinner", status: "SUCCESS", time: "Yesterday, 8:30 PM" },
  ];

  const triggerSave = (e: any) => {
    e.preventDefault();
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  return (
    <div className="p-6 pt-8 pb-24 animate-in fade-in duration-500 space-y-6 max-w-lg mx-auto relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-in slide-in-from-top-10 fade-in zoom-in duration-300">
           ✅ <span className="font-bold text-sm">Resident data saved</span>
        </div>
      )}

      {/* Danger Modal */}
      {showModal && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center">
               <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
               </div>
               <h3 className="text-xl font-bold text-slate-900 mb-2">Deactivate Resident?</h3>
               <p className="text-slate-500 text-sm mb-8">This will immediately block their QR code and prevent them from scanning at any site.</p>
               <div className="flex gap-3">
                  <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 font-bold text-slate-700 py-3 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                  <button onClick={() => setShowModal(false)} className="flex-1 bg-red-600 font-bold text-white py-3 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30">Deactivate</button>
               </div>
            </div>
         </div>
      )}

      <div className="flex justify-between items-center mb-2">
         <Link href="/admin/residents" className="inline-flex items-center text-blue-600 font-bold hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Residents
         </Link>
         <button onClick={triggerSave} className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-md">
            <Save className="w-3.5 h-3.5" /> Save
         </button>
      </div>
      
      {/* Profile Form */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-200">
         <div className="flex justify-between items-start mb-4">
            <div className="flex-1 mr-4 space-y-1">
               <input defaultValue="Harshit Agarwal" className="text-2xl font-bold text-slate-900 w-full focus:outline-none border-b border-transparent focus:border-blue-500 pb-1 bg-transparent" />
               <input defaultValue="+91 9876543210" className="text-slate-500 text-sm w-full focus:outline-none border-b border-transparent focus:border-blue-500 pb-1 bg-transparent" />
               <input defaultValue="harshit@example.com" className="text-slate-500 text-sm w-full focus:outline-none border-b border-transparent focus:border-blue-500 pb-1 bg-transparent" />
            </div>
            <span className="bg-emerald-50 text-emerald-600 font-bold text-xs uppercase tracking-widest px-3 py-1 rounded-md shrink-0">Active</span>
         </div>
         <div className="space-y-3 mt-4">
            <div>
               <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 block">Assigned Plan</label>
               <select className="bg-slate-50 border border-slate-200 text-slate-800 font-bold px-3 py-2 rounded-xl focus:border-blue-500 focus:outline-none w-full">
                  <option>Standard Plan</option>
                  <option>Premium Plan</option>
               </select>
            </div>
         </div>
      </div>

      {/* Credit Override */}
      <div className="bg-slate-900 rounded-[32px] p-6 shadow-xl shadow-slate-900/10 text-white relative overflow-hidden">
         <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl opacity-20 -mr-10 -mt-10"></div>
         <h2 className="text-lg font-bold mb-1 relative z-10">Meal Credits Dashboard</h2>
         <p className="text-slate-400 text-xs mb-6 relative z-10">Administrative live override</p>
         
         <div className="flex items-center justify-between mb-6 relative z-10 bg-black/20 p-4 rounded-2xl border border-white/10">
            <span className="text-slate-400 font-bold uppercase tracking-widest text-xs">Current Balance</span>
            <span className="text-4xl font-black transition-all">{balance}</span>
         </div>

         <div className="flex gap-3 relative z-10">
            <button onClick={() => { setBalance(b => b + 1); triggerSave(new CustomEvent('save')); }} className="flex-1 bg-white/10 hover:bg-white/20 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-colors border border-white/10 active:scale-95">
              <ArrowUpCircle className="w-5 h-5 text-emerald-400" /> +1 Credit
            </button>
            <button onClick={() => { setBalance(b => b - 1); triggerSave(new CustomEvent('save')); }} className="flex-1 bg-white/10 hover:bg-white/20 py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-sm transition-colors border border-white/10 active:scale-95">
              <ArrowDownCircle className="w-5 h-5 text-red-400" /> -1 Credit
            </button>
         </div>
      </div>

      {/* Mini History */}
      <div className="bg-white rounded-[24px] shadow-sm border border-slate-200 overflow-hidden">
         <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-slate-700 text-sm">Recent Scans</h3>
         </div>
         <div className="divide-y divide-slate-50">
            {mockHistory.map(tx => (
               <div key={tx.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{tx.type}</h4>
                    <p className="text-slate-500 text-xs mt-0.5">{tx.site}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-600 font-bold text-[10px] uppercase bg-emerald-50 px-2 py-0.5 rounded shadow-sm">{tx.status}</span>
                    <p className="text-slate-400 text-[10px] mt-1">{tx.time}</p>
                  </div>
               </div>
            ))}
         </div>
      </div>

      {/* Danger Zone */}
      <div className="border border-red-200 bg-red-50 rounded-[24px] p-5">
         <h3 className="font-bold text-red-700 text-sm mb-3">Danger Zone</h3>
         <button onClick={() => setShowModal(true)} className="w-full bg-red-100 hover:bg-red-200 text-red-700 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 border border-red-200 active:scale-95">
            <Trash2 className="w-4 h-4" /> Deactivate Resident
         </button>
      </div>
    </div>
  )
}
