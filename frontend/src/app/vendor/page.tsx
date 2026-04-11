"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ArrowRight } from "lucide-react";

export default function VendorSiteSelection() {
  const [selectedSite, setSelectedSite] = useState<number | null>(null);
  const router = useRouter();

  const sites = [
    { id: 1, name: "Main Cafeteria", status: "Active" },
    { id: 2, name: "Hostel B Mess", status: "Active" },
    { id: 3, name: "Admin Block Snacks", status: "Inactive" },
  ];

  const handleContinue = () => {
    if (selectedSite) {
        localStorage.setItem("vendorSiteId", selectedSite.toString());
        router.push("/vendor/scan");
    }
  }

  return (
    <div className="p-6 h-full flex flex-col pt-12 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold mb-2">Select Site</h1>
      <p className="text-neutral-400 mb-8 font-medium">Choose your current location to start scanning.</p>
      
      <div className="flex-1 space-y-4">
        {sites.map(site => (
           <button 
             key={site.id}
             onClick={() => setSelectedSite(site.id)}
             className={`w-full text-left p-5 rounded-[24px] border-2 transition-all duration-300 flex items-center justify-between ${selectedSite === site.id ? 'border-amber-500 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.1)]' : 'border-neutral-800 bg-neutral-800/50 hover:bg-neutral-800 hover:border-neutral-700'}`}
           >
              <div className="flex items-center gap-5">
                 <div className={`p-4 rounded-full transition-colors ${selectedSite === site.id ? 'bg-amber-500/20 text-amber-500' : 'bg-neutral-700/50 text-neutral-400'}`}>
                    <MapPin className="w-6 h-6" />
                 </div>
                 <div>
                   <h3 className="font-bold text-lg text-white">{site.name}</h3>
                   <span className={`text-xs font-bold uppercase tracking-wider ${site.status === 'Active' ? 'text-emerald-400' : 'text-neutral-500'}`}>{site.status}</span>
                 </div>
              </div>
           </button>
        ))}
      </div>

      <button 
        onClick={handleContinue}
        disabled={!selectedSite}
        className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-neutral-950 font-black py-4 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-amber-500/20 mt-4"
      >
        Continue to Scanner <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  )
}
