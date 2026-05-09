"use client";
import { ArrowLeft, Save, MapPin, Loader2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/apiClient";
import { useRouter } from "next/navigation";

export default function AdminSiteCreate() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return alert("Site name is required");
    setLoading(true);
    try {
      await api.post("/sites", {
        name,
        vendor_staff_ids: [],
        meal_windows: {
          BREAKFAST: { start: "07:30", end: "09:30" },
          LUNCH:     { start: "12:30", end: "14:30" },
          DINNER:    { start: "19:30", end: "21:30" },
        }
      });
      router.push("/admin/sites");
    } catch (e: any) {
      alert(e.message || "Failed to create site");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 pt-8 pb-24 animate-in slide-in-from-right duration-500 space-y-6 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
         <Link href="/admin/sites" className="inline-flex items-center text-blue-600 font-bold hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Sites
         </Link>
         <button onClick={handleCreate} disabled={loading} className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-md disabled:opacity-70">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Create Site
         </button>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Create New Site</h1>
      
      <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleCreate(); }}>
         <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm space-y-4">
            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Site Display Name</label>
               <div className="relative">
                 <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="PG South Wing" autoFocus required className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none" />
               </div>
            </div>
         </div>
         <p className="text-xs text-slate-500 px-2 leading-relaxed">
            * Meal windows are pre-set to standard timings (Breakfast: 7:30AM-9:30AM, Lunch: 12:30PM-2:30PM, Dinner: 7:30PM-9:30PM). You will be able to edit these natively in an upcoming release.
         </p>
      </form>
    </div>
  )
}
