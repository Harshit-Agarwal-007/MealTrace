"use client";
import { ArrowLeft, Save, MapPin, KeyRound, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { use, useState } from "react";

export default function AdminVendorDetail({ params }: { params: Promise<{id: string}> }) {
  const { id } = use(params);
  const [toast, setToast] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const triggerSave = (e: any) => {
    e.preventDefault();
    setToast(true);
    setTimeout(() => setToast(false), 3000);
  };

  return (
    <div className="p-6 pt-8 pb-24 animate-in fade-in duration-500 space-y-6 max-w-lg mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-in slide-in-from-top-10 fade-in zoom-in duration-300">
           ✅ <span className="font-bold text-sm">Vendor settings saved</span>
        </div>
      )}

      {/* Danger Modal */}
      {showModal && (
         <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[32px] p-8 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center">
               <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
               </div>
               <h3 className="text-xl font-bold text-slate-900 mb-2">Revoke Vendor Access?</h3>
               <p className="text-slate-500 text-sm mb-8">This will instantly log out the vendor device and prevent them from verifying any meal scans.</p>
               <div className="flex gap-3">
                  <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 font-bold text-slate-700 py-3 rounded-xl hover:bg-slate-200 transition-colors">Cancel</button>
                  <button onClick={() => setShowModal(false)} className="flex-1 bg-red-600 font-bold text-white py-3 rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-500/30">Revoke Now</button>
               </div>
            </div>
         </div>
      )}

      <div className="flex justify-between items-center mb-2">
         <Link href="/admin/vendors" className="inline-flex items-center text-blue-600 font-bold hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Vendors
         </Link>
         <button onClick={triggerSave} className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-md">
            <Save className="w-3.5 h-3.5" /> Save
         </button>
      </div>
      
      {/* Vendor Profile */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-200">
         <div className="mb-4">
            <input 
              defaultValue={id === '1' ? "Vendor Kiosk 1" : "Vendor Device"} 
              className="text-2xl font-bold text-slate-900 w-full focus:outline-none border-b border-transparent focus:border-blue-500 pb-1 bg-transparent" 
            />
            <input 
              defaultValue={id === '1' ? "vendor1@mealtrace.com" : "vendor@example.com"}
              className="text-slate-500 text-sm mt-1 w-full focus:outline-none border-b border-transparent focus:border-blue-500 pb-1 bg-transparent" 
            />
         </div>
         <div className="flex gap-2">
            <span className="bg-emerald-50 text-emerald-600 font-bold text-xs uppercase tracking-widest px-3 py-1.5 rounded-md">Account Active</span>
         </div>
      </div>

      {/* Assignment Data */}
      <h2 className="text-xl font-bold text-slate-800 ml-2 mt-8">Site Assignment</h2>
      <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm relative overflow-hidden flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors">
         <div className="p-3 bg-amber-50 text-amber-600 rounded-full">
            <MapPin className="w-6 h-6" />
         </div>
         <div className="flex-1">
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-0.5">Assigned Location</p>
            <select className="w-full bg-transparent font-bold text-slate-900 focus:outline-none appearance-none cursor-pointer">
               <option>Main Cafeteria (MC-01)</option>
               <option>Hostel B Mess (HB-02)</option>
               <option>Admin Block Snacks (AB-03)</option>
               <option>Unassigned</option>
            </select>
         </div>
      </div>

      {/* Security */}
      <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => { setToast(true); setTimeout(() => setToast(false), 3000); }}>
         <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><KeyRound className="w-5 h-5" /></div>
            <div>
               <h3 className="font-bold text-slate-900">Reset Credentials</h3>
               <p className="text-slate-500 text-xs mt-0.5">Send a quick password reset link</p>
            </div>
         </div>
      </div>

      {/* Danger Zone */}
      <div className="border border-red-200 bg-red-50 rounded-[24px] p-5 mt-8">
         <h3 className="font-bold text-red-700 text-sm mb-3">Danger Zone</h3>
         <button onClick={() => setShowModal(true)} className="w-full bg-red-100 hover:bg-red-200 text-red-700 py-3 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 border border-red-200 active:scale-95">
            <Trash2 className="w-4 h-4" /> Revoke Vendor Access
         </button>
      </div>
    </div>
  )
}
