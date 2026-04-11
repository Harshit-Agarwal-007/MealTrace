"use client";

/**
 * Vendor Site Picker
 *
 * GET /vendor/assigned-sites
 * LocalStorage `vendor_site_id` persistence
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Store, QrCode, LogOut, ChevronRight, Loader2, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";

export default function VendorDashboard() {
  const { logout } = useAuth();
  const router = useRouter();
  
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);

  useEffect(() => {
    setSelectedSite(localStorage.getItem("vendor_site_id"));
    
    api.get<{ sites: { id: string; name: string }[] }>("/vendor/assigned-sites")
       .then(res => setSites(res.sites || []))
       .catch(() => {})
       .finally(() => setLoading(false));
  }, []);

  const handleSelect = (id: string, name: string) => {
    localStorage.setItem("vendor_site_id", id);
    localStorage.setItem("vendor_site_name", name);
    setSelectedSite(id);
    router.push("/vendor/scan");
  };

  return (
    <div className="p-6 pt-8 animate-in fade-in flex flex-col min-h-screen bg-slate-50">
      <div className="flex justify-between items-center mb-8">
        <div>
          <p className="text-slate-500 font-bold text-sm uppercase tracking-wider">Scanner Interface</p>
          <h1 className="text-2xl font-black text-slate-900">Select Site</h1>
        </div>
        <button onClick={logout} className="p-3 bg-red-100 text-red-600 rounded-full hover:bg-red-200">
           <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="flex bg-blue-50 text-blue-700 p-4 rounded-xl items-start gap-3 mb-6 border border-blue-100 shadow-sm">
        <Info className="w-5 h-5 mt-0.5 shrink-0" />
        <p className="text-sm font-medium">Please select the service site where you are currently located. All scans will be logged against this site.</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
        </div>
      ) : (
        <div className="flex-1 space-y-4">
          {sites.length === 0 && (
             <p className="text-slate-500 text-sm font-bold text-center py-10 bg-white border rounded-3xl border-slate-200 border-dashed">
               No sites assigned to your account.
             </p>
          )}
          {sites.map(site => (
            <button
              key={site.id}
              onClick={() => handleSelect(site.id, site.name)}
              className={`w-full bg-white p-5 rounded-3xl shadow-sm border-2 text-left flex items-center justify-between group transition-all ${
                selectedSite === site.id ? "border-indigo-600 ring-4 ring-indigo-50" : "border-slate-100 hover:border-indigo-300"
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${selectedSite === site.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 group-hover:bg-indigo-100 group-hover:text-indigo-600"}`}>
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{site.name}</h3>
                  <p className="text-xs font-mono text-slate-400 mt-0.5">{site.id}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors" />
            </button>
          ))}
        </div>
      )}

      {selectedSite && (
        <div className="mt-auto pt-6">
          <Link href="/vendor/scan" className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-200">
             <QrCode className="w-5 h-5" /> Launch Scanner
          </Link>
        </div>
      )}
    </div>
  );
}
