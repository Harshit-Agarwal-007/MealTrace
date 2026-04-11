"use client";

/**
 * Admin Residents List
 *
 * GET /admin/residents?search=&page=
 */

import { useState, useEffect, useCallback } from "react";
import { Search, UserPlus, FileSpreadsheet, Loader2, ChevronRight } from "lucide-react";
import Link from "next/link";
import { api, downloadBlob } from "@/lib/apiClient";
import type { ResidentProfile } from "@/lib/types";
import debounce from "lodash/debounce";

export default function AdminResidents() {
  const [residents, setResidents] = useState<ResidentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [downloading, setDownloading] = useState(false);

  const fetchResidents = async (q: string = "") => {
    setLoading(true);
    try {
      const res = await api.get<{ residents: ResidentProfile[] }>(`/admin/residents?search=${encodeURIComponent(q)}&page_size=50`);
      setResidents(res.residents || []);
    } catch {
      setResidents([]);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedFetch = useCallback(debounce((q: string) => fetchResidents(q), 500), []);

  useEffect(() => {
    debouncedFetch(search);
  }, [search, debouncedFetch]);

  const handleExport = async () => {
    setDownloading(true);
    try {
      const blob = await api.get<Blob>("/admin/reports/financial", { returnBlob: true } as any);
      downloadBlob(blob, "residents_export.xlsx");
    } catch {
      alert("Failed to export");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-6 pt-8 pb-28 animate-in fade-in duration-500 space-y-6">
       <div className="flex justify-between items-center">
         <h1 className="text-2xl font-bold text-slate-900">Residents</h1>
         <div className="flex gap-2">
           <button onClick={handleExport} disabled={downloading} className="bg-slate-100 p-2.5 rounded-full text-slate-600 hover:bg-slate-200 disabled:opacity-50">
              {downloading ? <Loader2 className="w-4 h-4 animate-spin"/> : <FileSpreadsheet className="w-4 h-4" />}
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
             value={search}
             onChange={(e) => setSearch(e.target.value)}
             placeholder="Search name, phone, email..." 
             className="w-full bg-white border border-slate-200 rounded-[20px] py-3 pl-11 pr-4 text-slate-900 focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-400 font-medium shadow-sm"
           />
       </div>

       <div className="bg-white border text-sm border-slate-200 rounded-[24px] overflow-hidden shadow-sm min-h-[50vh]">
         {loading ? (
             <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-blue-500"/></div>
         ) : residents.length === 0 ? (
             <div className="p-8 text-center text-slate-400 font-medium">No residents found.</div>
         ) : (
             residents.map((res, i) => (
               <Link key={res.id} href={`/admin/residents/${res.id}`} className="block group">
                 <div className={`p-4 flex justify-between items-center hover:bg-slate-50 transition-colors ${i !== 0 ? 'border-t border-slate-100' : ''}`}>
                    <div>
                       <p className="font-bold text-slate-900 flex items-center gap-2">
                          {res.name}
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${res.dietary_preference === 'VEG' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                             {res.dietary_preference || "VEG"}
                          </span>
                       </p>
                       <p className="text-slate-500 text-xs mt-1">{res.email}</p>
                       {res.room_number && <p className="text-slate-400 text-[10px] mt-0.5 uppercase tracking-wide">Room {res.room_number}</p>}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500" />
                 </div>
               </Link>
             ))
         )}
       </div>
    </div>
  )
}
