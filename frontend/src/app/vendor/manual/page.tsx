"use client";
import { useState } from "react";
import { Search, CheckCircle2 } from "lucide-react";

export default function VendorManualEntry() {
  const [query, setQuery] = useState("");
  const [searchResult, setSearchResult] = useState<any | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim().length > 2) {
       setSearchResult({
         id: "res_123",
         name: "Harshit Agarwal",
         phone: "+91 9876543210",
         room: "204 B",
         plan: "Standard Plan",
         balance: 42
       });
    } else {
       setSearchResult(null);
    }
  }

  return (
    <div className="p-6 pt-12 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold mb-2">Manual Entry</h1>
      <p className="text-neutral-400 mb-8 font-medium">Search resident by phone or name to deduct manually.</p>

      <form onSubmit={handleSearch} className="mb-8 relative">
        <div className="relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
           <input 
             type="text" 
             placeholder="Enter phone or name..." 
             value={query}
             onChange={e => setQuery(e.target.value)}
             className="w-full bg-neutral-800/80 border-2 border-neutral-700/50 rounded-[24px] py-4 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500 transition-colors placeholder:text-neutral-500 font-semibold shadow-inner"
           />
           <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 bg-amber-500 text-neutral-900 px-4 py-2 rounded-xl font-bold text-sm hover:bg-amber-400 transition-colors">
             Find
           </button>
        </div>
      </form>

      {searchResult && (
        <div className="bg-neutral-800/60 backdrop-blur-md rounded-[32px] p-6 border border-neutral-700/50 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300">
           <div className="flex justify-between items-start mb-6">
              <div>
                 <h2 className="text-xl font-bold text-white">{searchResult.name}</h2>
                 <p className="text-neutral-400 text-sm mt-1">{searchResult.phone} • Room {searchResult.room}</p>
                 <span className="inline-block mt-3 bg-neutral-900 border border-neutral-700 text-amber-500 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">{searchResult.plan}</span>
              </div>
              <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-700 text-center shadow-inner">
                 <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">Balance</p>
                 <p className="text-white text-3xl font-black">{searchResult.balance}</p>
              </div>
           </div>
           
           <button className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-neutral-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-amber-500/20">
              <CheckCircle2 className="w-5 h-5 mb-0.5" />
              Deduct 1 Meal
           </button>
        </div>
      )}
    </div>
  )
}
