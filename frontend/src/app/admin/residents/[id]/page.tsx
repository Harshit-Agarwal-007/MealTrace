"use client";

import { useState, useEffect, useCallback, use } from "react";
import { 
  ChevronLeft, Save, Loader2, Mail, Phone, 
  MapPin, Tag, CheckCircle2, AlertCircle, RefreshCw,
  User as UserIcon, Calendar, IndianRupee
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import type { ResidentProfile } from "@/lib/types";

export default function AdminResidentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  
  const [resident, setResident] = useState<ResidentProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await api.get<ResidentProfile>(`/admin/residents/${id}`);
      setResident(data);
    } catch (err: any) {
      setError(err.message || "Failed to load resident details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resident) return;
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      await api.patch(`/admin/residents/${resident.id}`, {
        name: resident.name,
        room_number: resident.room_number,
        phone: resident.phone,
        dietary_preference: resident.dietary_preference,
        status: resident.status
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save profile changes");
    } finally {
      setSaving(false);
    }
  };

  const setRes = (field: keyof ResidentProfile, val: any) => {
    if (resident) setResident({ ...resident, [field]: val });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Fetching Resident...</p>
      </div>
    );
  }

  if (error && !resident) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-[32px] border border-red-100 font-bold max-w-sm mx-auto">
          {error}
        </div>
        <button onClick={() => window.location.reload()} className="text-indigo-600 font-black flex items-center gap-2 mx-auto">
          <RefreshCw className="w-4 h-4" /> Try Again
        </button>
      </div>
    );
  }

  if (!resident) return null;

  return (
    <div className="p-6 pt-safe pb-32 animate-in fade-in space-y-6 max-w-lg mx-auto">
      {/* Header Actions */}
      <div className="flex items-center justify-between mb-2">
        <Link href="/admin/residents" className="bg-white p-3 rounded-full shadow-sm border border-slate-100 hover:bg-slate-50 transition-all">
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-xs font-black flex items-center gap-2 active:scale-95 transition-all shadow-xl disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin"/> : <Save className="w-4 h-4"/>}
          {saving ? "Updating..." : "Save Changes"}
        </button>
      </div>

      {/* Success Feedback */}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3 animate-in slide-in-from-top duration-300">
           <CheckCircle2 className="w-5 h-5" />
           <p className="text-sm font-bold">Resident profile updated successfully</p>
        </div>
      )}

      {/* Profile Sections */}
      <div className="space-y-6">
        {/* Core Info Card */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6">
             <div 
               onClick={() => setRes("status", resident.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}
               className={`w-12 h-6 rounded-full relative shadow-inner cursor-pointer transition-colors duration-300 ${resident.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-400'}`}
             >
                <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-md transition-all duration-300 ${resident.status === 'ACTIVE' ? 'right-0.5' : 'left-0.5'}`}></div>
             </div>
             <p className="text-[10px] font-black uppercase text-center mt-1 text-slate-400">{resident.status}</p>
          </div>

          <div className="flex items-center gap-4 mb-8">
             <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400">
                <UserIcon className="w-8 h-8" />
             </div>
             <div>
                <input 
                  type="text" 
                  value={resident.name} 
                  onChange={e => setRes("name", e.target.value)} 
                  className="text-xl font-black text-slate-900 focus:outline-none border-b border-transparent focus:border-indigo-500 bg-transparent" 
                />
                <p className="text-slate-400 text-xs font-mono lowercase tracking-tight">{resident.id}</p>
             </div>
          </div>

          <form className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Room No.</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="text" 
                      value={resident.room_number || ""} 
                      onChange={e => setRes("room_number", e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-100 py-3 pl-11 pr-4 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all outline-none" 
                    />
                  </div>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Diet Preference</label>
                  <div className="relative">
                    <Tag className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <select 
                      value={resident.dietary_preference} 
                      onChange={e => setRes("dietary_preference", e.target.value)} 
                      className="w-full bg-slate-50 border border-slate-100 py-3 pl-11 pr-4 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all outline-none appearance-none"
                    >
                       <option value="VEG">VEG</option>
                       <option value="NON-VEG">NON-VEG</option>
                    </select>
                  </div>
               </div>
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Phone Number</label>
               <div className="relative">
                 <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                   type="text" 
                   value={resident.phone || ""} 
                   onChange={e => setRes("phone", e.target.value)} 
                   className="w-full bg-slate-50 border border-slate-100 py-3 pl-11 pr-4 rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-indigo-100 transition-all outline-none" 
                 />
               </div>
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-1">Email (Static)</label>
               <div className="relative">
                 <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                   type="text" 
                   disabled 
                   value={resident.email} 
                   className="w-full bg-slate-100 border border-slate-200 py-3 pl-11 pr-4 rounded-2xl font-bold text-slate-400 opacity-60 cursor-not-allowed" 
                 />
               </div>
            </div>
          </form>
        </div>

        {/* Subscription Info Card */}
        <div className="bg-slate-900 text-white rounded-[32px] p-8 shadow-xl shadow-slate-200">
           <div className="flex justify-between items-start mb-6">
              <h3 className="text-lg font-black tracking-wide">Subscription Status</h3>
              <Calendar className="w-5 h-5 text-slate-500" />
           </div>
           
           <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-800 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Current Balance</p>
                    <div className="flex items-center gap-1.5">
                       <IndianRupee className="w-4 h-4 text-amber-500" />
                       <p className="text-2xl font-black">{resident.balance || 0}</p>
                    </div>
                 </div>
                 <div className="bg-slate-800 rounded-2xl p-4">
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Current Plan</p>
                    <p className="text-lg font-black truncate">{resident.plan_id || "None"}</p>
                 </div>
              </div>

              {resident.allowed_meals && resident.allowed_meals.length > 0 && (
                <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-2xl p-4">
                   <p className="text-[10px] font-black uppercase text-indigo-400 tracking-widest mb-2">Permitted Meals</p>
                   <div className="flex gap-2">
                      {resident.allowed_meals.map(m => (
                        <span key={m} className="bg-indigo-500 text-white text-[10px] font-black px-2 py-1 rounded-md">
                           {m}
                        </span>
                      ))}
                   </div>
                </div>
              )}
           </div>
        </div>

        {/* Danger Zone */}
        {resident.status === 'ACTIVE' && (
          <div className="bg-red-50 border border-red-100 rounded-[28px] p-6 text-center">
             <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
             <h4 className="text-red-900 font-black text-sm uppercase tracking-widest">Restrict Access?</h4>
             <p className="text-red-600/60 text-[10px] font-bold mt-1 mb-4">
                Deactivating the resident will block all future meal scans and invalidate their current QR code immediately.
             </p>
             <button 
               onClick={() => setRes("status", "INACTIVE")}
               className="bg-red-600 hover:bg-red-700 text-white font-black py-3 px-8 rounded-xl text-xs transition-all active:scale-95 shadow-lg shadow-red-200"
             >
                Deactivate Resident
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
