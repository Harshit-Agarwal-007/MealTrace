"use client";

/**
 * Manual Scan Entry
 *
 * GET /vendor/search-user?q=
 * POST /scan/manual
 */

import { useState, useCallback, useEffect } from "react";
import { Search, UserMinus, ChevronLeft, Loader2, Info } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import type { SearchResult } from "@/lib/types";
import debounce from "lodash/debounce";
import { useRouter } from "next/navigation";

export default function ManualEntryPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [processing, setProcessing] = useState<string | null>(null);

  // Debounced search
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const handleSearch = useCallback(
    debounce(async (q: string) => {
      if (q.length < 2) {
        setSuggestions([]);
        return;
      }
      setIsSearching(true);
      try {
        const payload = await api.get<{ results: SearchResult[] }>(`/vendor/search-user?q=${encodeURIComponent(q)}`);
        setSuggestions(payload.results || []);
      } catch {
        setSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    }, 400),
    []
  );

  useEffect(() => {
    handleSearch(query);
  }, [query, handleSearch]);

  const handleManualDeduct = async (residentId: string, name: string) => {
    setProcessing(residentId);
    try {
      const siteId = localStorage.getItem("vendor_site_id");
      if (!siteId) throw new Error("No site selected");

      await api.post("/scan/manual", {
        resident_id: residentId,
        site_id: siteId,
        block_reason_override: "MANUAL_ENTRY" // Or similar payload if required by backend
      });

      alert(`Successfully deducted meal for ${name}`);
      router.back();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="p-6 pt-8 bg-slate-50 min-h-screen">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/vendor/scan" className="bg-white p-2.5 rounded-full shadow-sm">
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <h1 className="text-2xl font-black text-slate-900">Manual Entry</h1>
      </div>

      <div className="flex bg-blue-50 text-blue-700 p-4 rounded-xl items-start gap-3 mb-6 border border-blue-100 shadow-sm">
        <Info className="w-5 h-5 mt-0.5 shrink-0" />
        <p className="text-sm font-medium">Use this ONLY if the resident's QR code is unreadable or phone is dead.</p>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, phone, or ID..."
          className="w-full bg-white border border-slate-200 rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        {isSearching && (
          <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 animate-spin" />
        )}
      </div>

      {!query ? (
         <div className="text-center py-20 opacity-50">
           <UserMinus className="w-16 h-16 mx-auto mb-4 text-slate-400" />
           <p className="text-slate-500 font-bold">Search to view results</p>
         </div>
      ) : suggestions.length === 0 && !isSearching ? (
         <div className="text-center py-20 bg-white border border-dashed border-slate-200 rounded-3xl">
           <p className="text-slate-500 font-bold">No residents found.</p>
         </div>
      ) : (
         <div className="space-y-4">
           {suggestions.map(s => (
             <div key={s.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">{s.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${s.dietary_preference === "VEG" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                      {s.dietary_preference || "VEG"}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-mono">{s.id}</span>
                  </div>
                  {(s.room_number || s.phone) && (
                    <p className="text-xs text-slate-400 mt-2 font-medium">Room {s.room_number} • {s.phone}</p>
                  )}
                </div>
                <button 
                  disabled={processing === s.id}
                  onClick={() => handleManualDeduct(s.id, s.name)}
                  className="bg-slate-900 text-white font-bold px-4 py-2 text-sm rounded-xl hover:bg-slate-800 disabled:opacity-50"
                >
                  {processing === s.id ? <Loader2 className="w-4 h-4 animate-spin"/> : "Deduct"}
                </button>
             </div>
           ))}
         </div>
      )}
    </div>
  );
}
