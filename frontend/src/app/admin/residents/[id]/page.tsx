"use client";

/**
 * Admin Resident Detail
 *
 * GET /admin/residents/{id}
 */

import { useState, useEffect } from "react";
import { ChevronLeft, Save, Loader2, Mail, Phone, MapPin, Tag } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import type { ResidentProfile } from "@/lib/types";

export default function AdminResidentDetailPage({ params }: { params: { id: string } }) {
  const [resident, setResident] = useState<ResidentProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In actual implementation, backend needs GET /admin/residents/{id} endpoint
    // We will use standard /admin/residents list and filter for this demo, 
    // or assume /admin/residents/{id} exists.
    api.get<{ residents: ResidentProfile[] }>(`/admin/residents?search=${params.id}`)
      .then(res => {
         const found = res.residents.find(r => r.id === params.id);
         if (found) setResident(found);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [params.id]);

  const setRes = (field: keyof ResidentProfile, val: any) => {
    if (resident) setResident({ ...resident, [field]: val });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resident) return;
    setSaving(true);
    try {
      await api.patch(`/admin/residents/${resident.id}`, {
        name: resident.name,
        room_number: resident.room_number,
        phone: resident.phone,
        dietary_preference: resident.dietary_preference
      });
      alert("Saved!");
    } catch (err: any) {
      alert("Failed to save: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
     return <div className="p-6 pt-safe flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-600"/></div>;
  }

  if (!resident) {
     return <div className="p-6 pt-safe">Resident not found.</div>;
  }

  return (
    <div className="p-6 pt-safe pb-28 animate-in fade-in space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin/residents" className="bg-white p-2.5 rounded-full shadow-sm border border-slate-100">
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <h1 className="text-xl font-black text-slate-900">Resident Detalls</h1>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
         <form onSubmit={handleSave} className="space-y-4">
            <div>
               <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block">Name</label>
               <input type="text" value={resident.name} onChange={e => setRes("name", e.target.value)} className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl font-bold" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block flex items-center gap-1"><MapPin className="w-3 h-3"/> Room</label>
                  <input type="text" value={resident.room_number || ""} onChange={e => setRes("room_number", e.target.value)} className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl font-bold" />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block flex items-center gap-1"><Tag className="w-3 h-3"/> Diet</label>
                  <select value={resident.dietary_preference} onChange={e => setRes("dietary_preference", e.target.value)} className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl font-bold">
                     <option value="VEG">VEG</option>
                     <option value="NON-VEG">NON-VEG</option>
                  </select>
               </div>
            </div>

            <div>
               <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block flex items-center gap-1"><Phone className="w-3 h-3"/> Phone</label>
               <input type="text" value={resident.phone || ""} onChange={e => setRes("phone", e.target.value)} className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl" />
            </div>

            <div>
               <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 block flex items-center gap-1"><Mail className="w-3 h-3"/> Email</label>
               <input type="text" disabled value={resident.email} className="w-full bg-slate-100 border border-slate-200 py-3 px-4 rounded-xl opacity-70" />
               <p className="text-[10px] text-slate-400 mt-1">Email cannot be changed.</p>
            </div>

            <button disabled={saving} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 mt-4 disabled:opacity-50">
               {saving ? <Loader2 className="w-5 h-5 animate-spin"/> : <><Save className="w-5 h-5"/> Save Changes</>}
            </button>
         </form>
      </div>
      
      {/* Transaction History removed from this view to simplify PWA complexity. History is viewed by resident. */}
    </div>
  );
}
