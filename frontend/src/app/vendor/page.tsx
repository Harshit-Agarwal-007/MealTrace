"use client";

/**
 * Vendor Site Selection — wiring doc §4.2
 *
 * GET /vendor/assigned-sites → { sites: SiteInfo[], count: number }
 * Preferred: assigned sites only.
 * Bound site_id is persisted to localStorage for every scan in the session.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { SiteInfo } from "@/lib/types";

export default function VendorSiteSelection() {
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    api.get<{ sites: SiteInfo[]; count: number }>("/vendor/assigned-sites")
      .then((data) => setSites(data.sites ?? []))
      .catch(() => setError("Could not load assigned sites. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  const handleContinue = () => {
    if (selectedSiteId) {
      // Persist site_id for the scanner — wiring doc §4.2
      localStorage.setItem("vendorSiteId", selectedSiteId);
      router.push("/vendor/scan");
    }
  };

  return (
    <div className="p-6 h-full flex flex-col pt-12 animate-in fade-in duration-500">
      <h1 className="text-3xl font-bold mb-2">Select Site</h1>
      <p className="text-neutral-400 mb-8 font-medium">Choose your current location to start scanning.</p>

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="flex items-center gap-3 bg-red-900/20 border border-red-800/50 text-red-400 p-4 rounded-2xl mb-6">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span className="text-sm font-medium">{error}</span>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && sites.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 gap-3">
          <MapPin className="w-12 h-12 opacity-30" />
          <p className="font-semibold">No sites assigned</p>
          <p className="text-xs">Ask your administrator to assign you to a site.</p>
        </div>
      )}

      {/* Site List */}
      {!loading && sites.length > 0 && (
        <div className="flex-1 space-y-4">
          {sites.map((site) => (
            <button
              key={site.id}
              onClick={() => setSelectedSiteId(site.id)}
              className={`w-full text-left p-5 rounded-[24px] border-2 transition-all duration-300 flex items-center justify-between ${
                selectedSiteId === site.id
                  ? "border-amber-500 bg-amber-500/10 shadow-[0_0_30px_rgba(245,158,11,0.1)]"
                  : "border-neutral-800 bg-neutral-800/50 hover:bg-neutral-800 hover:border-neutral-700"
              } ${!site.is_active ? "opacity-40 cursor-not-allowed" : ""}`}
              disabled={!site.is_active}
            >
              <div className="flex items-center gap-5">
                <div className={`p-4 rounded-full transition-colors ${
                  selectedSiteId === site.id
                    ? "bg-amber-500/20 text-amber-500"
                    : "bg-neutral-700/50 text-neutral-400"
                }`}>
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white">{site.name}</h3>
                  <span className={`text-xs font-bold uppercase tracking-wider ${
                    site.is_active ? "text-emerald-400" : "text-neutral-500"
                  }`}>
                    {site.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              {selectedSiteId === site.id && (
                <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      <button
        onClick={handleContinue}
        disabled={!selectedSiteId}
        className="w-full bg-gradient-to-r from-amber-400 to-amber-500 text-neutral-950 font-black py-4 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-lg shadow-amber-500/20 mt-6"
      >
        Continue to Scanner <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
}
