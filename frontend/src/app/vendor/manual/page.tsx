"use client";
import { useState, useEffect } from "react";
import { Search, CheckCircle2, User, Loader2 } from "lucide-react";

export default function VendorManualEntry() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  // Debounced Auto-complete Effect
  useEffect(() => {
    if (query.trim().length >= 3) {
      setIsSearching(true);
      setShowDropdown(true);
      
      // Mock API call delay
      const timer = setTimeout(() => {
        setSearchResults([
          { id: "res_123", name: "Harshit Agarwal", phone: "+91 9876543210", room: "204 B", plan: "Standard Plan", balance: 42 },
          { id: "res_124", name: "Harsh Vardhan", phone: "+91 8888888888", room: "101 A", plan: "Guest Pass", balance: 1 }
        ].filter(u => u.name.toLowerCase().includes(query.toLowerCase()) || u.phone.includes(query)));
        setIsSearching(false);
      }, 500);
      
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  }, [query]);

  const handleSelect = (user: any) => {
    setSelectedUser(user);
    setQuery("");
    setShowDropdown(false);
  }

  const handleDeduct = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Successfully deducted 1 meal from ${selectedUser.name}!`);
    setSelectedUser(null);
  }

  return (
    <div className="p-6 pt-12 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold mb-2">Manual Entry</h1>
      <p className="text-neutral-400 mb-8 font-medium">Search resident by phone or name to deduct manually. (Min 3 chars)</p>

      <div className="mb-8 relative z-50">
        <div className="relative">
           <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500 w-5 h-5" />
           <input 
             type="text" 
             placeholder="Enter phone or name..." 
             value={query}
             onChange={e => setQuery(e.target.value)}
             className="w-full bg-neutral-800/80 border-2 border-neutral-700/50 rounded-[24px] py-4 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500 transition-colors placeholder:text-neutral-500 font-semibold shadow-inner"
           />
           {isSearching && (
              <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-500 animate-spin" />
           )}
        </div>

        {/* Autocomplete Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 w-full mt-2 bg-neutral-800 border border-neutral-700 rounded-2xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
             {!isSearching && searchResults.length === 0 ? (
               <div className="p-4 text-center text-neutral-500 text-sm">No residents found.</div>
             ) : (
               searchResults.map(user => (
                  <button 
                    key={user.id} 
                    onClick={() => handleSelect(user)}
                    className="w-full p-4 flex items-center gap-4 text-left hover:bg-neutral-700/50 transition-colors border-b border-neutral-700/30 last:border-0"
                  >
                     <div className="bg-neutral-900 p-2 rounded-full shrink-0">
                        <User className="w-5 h-5 text-amber-500" />
                     </div>
                     <div>
                        <div className="text-white font-bold">{user.name}</div>
                        <div className="text-neutral-400 text-xs mt-0.5">{user.phone} • {user.room}</div>
                     </div>
                  </button>
               ))
             )}
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="bg-neutral-800/60 backdrop-blur-md rounded-[32px] p-6 border border-neutral-700/50 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300 relative z-0">
           <div className="flex justify-between items-start mb-6">
              <div>
                 <h2 className="text-xl font-bold text-white">{selectedUser.name}</h2>
                 <p className="text-neutral-400 text-sm mt-1">{selectedUser.phone} • Room {selectedUser.room}</p>
                 <span className="inline-block mt-3 bg-neutral-900 border border-neutral-700 text-amber-500 text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wider">{selectedUser.plan}</span>
              </div>
              <div className="bg-neutral-900 p-4 rounded-2xl border border-neutral-700 text-center shadow-inner">
                 <p className="text-neutral-500 text-xs font-bold uppercase tracking-widest mb-1">Balance</p>
                 <p className="text-white text-3xl font-black">{selectedUser.balance}</p>
              </div>
           </div>
           
           <button onClick={handleDeduct} className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-neutral-950 font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-amber-500/20">
              <CheckCircle2 className="w-5 h-5 mb-0.5" />
              Deduct 1 Meal
           </button>
        </div>
      )}
    </div>
  )
}
