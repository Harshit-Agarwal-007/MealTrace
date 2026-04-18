"use client";

import { useState, useEffect, useCallback, use } from "react";
import { 
  ArrowLeft, Clock, Save, Loader2, MapPin, 
  CheckCircle2, AlertTriangle, RefreshCw 
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import type { SiteInfo } from "@/lib/types";

// Local types for the scan feed
interface SiteScanFeed {
  scans: {
    scan_id: string;
    resident_id: string;
    resident_info?: {
      name: string;
      room_number: string;
    };
    meal_type: string;
    status: string;
    timestamp: string;
  }[];
  count: number;
}

export default function AdminSiteDetail({ params }: { params: Promise<{id: string}> }) {
  const { id } = use(params);
  
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [feed, setFeed] = useState<SiteScanFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [siteData, feedData] = await Promise.all([
        api.get<SiteInfo>(`/sites/${id}`),
        api.get<SiteScanFeed>(`/admin/sites/${id}/live-scans?hours=24`)
      ]);
      setSite(siteData);
      setFeed(feedData);
    } catch (err: any) {
      setError(err.message || "Failed to load site data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!site) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.patch(`/sites/${id}`, {
        name: site.name,
        is_active: site.is_active,
        meal_windows: site.meal_windows
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const updateMealWindow = (meal: string, field: "start" | "end", value: string) => {
    if (!site) return;
    const windows = { ...site.meal_windows };
    if (!windows[meal]) {
       // Initialize window if missing
       windows[meal] = { start: "00:00", end: "00:00" };
    }
    windows[meal] = { ...windows[meal], [field]: value };
    setSite({ ...site, meal_windows: windows });
  };

  const toggleSiteStatus = () => {
    if (!site) return;
    setSite({ ...site, is_active: !site.is_active });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
        <p className="text-slate-500 font-bold">Loading site details...</p>
      </div>
    );
  }

  if (error && !site) {
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

  if (!site) return null;

  return (
    <div className="p-6 pt-8 pb-32 animate-in fade-in duration-500 space-y-6 max-w-lg mx-auto">
      {/* Header Actions */}
      <div className="flex justify-between items-center mb-2">
         <Link href="/admin/sites" className="inline-flex items-center text-indigo-600 font-black hover:opacity-70 transition-all">
            <ArrowLeft className="w-4 h-4 mr-1" /> Sites
         </Link>
         <button 
           onClick={handleSave}
           disabled={saving}
           className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-xs font-black flex items-center gap-2 active:scale-95 transition-all shadow-xl disabled:opacity-50"
         >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Saving..." : "Save Changes"}
         </button>
      </div>

      {/* Persistence Feedback */}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3 animate-in slide-in-from-top duration-300">
           <CheckCircle2 className="w-5 h-5" />
           <p className="text-sm font-bold">Site configuration updated successfully</p>
        </div>
      )}
      
      {/* Site Header Card */}
      <div className="bg-white rounded-[32px] p-6 shadow-sm border border-slate-200">
         <div className="flex justify-between items-start mb-4">
            <div className="flex-1 mr-4">
               <input 
                 value={site.name}
                 onChange={(e) => setSite({ ...site, name: e.target.value })}
                 placeholder="Enter Site Name"
                 className="text-2xl font-black text-slate-900 w-full focus:outline-none border-b border-transparent focus:border-indigo-500 pb-1 bg-transparent transition-all" 
               />
               <p className="text-slate-400 text-xs mt-1 font-mono uppercase tracking-widest">{site.id}</p>
            </div>
            
            {/* Status Toggle Switch */}
            <div 
              onClick={toggleSiteStatus}
              className={`w-12 h-6 rounded-full relative shadow-inner cursor-pointer shrink-0 mt-1.5 transition-colors duration-300 ${site.is_active ? 'bg-emerald-500' : 'bg-slate-300'}`}
            >
               <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-md transition-all duration-300 ${site.is_active ? 'right-0.5' : 'left-0.5'}`}></div>
            </div>
         </div>
      </div>

      {/* Meal Windows Section */}
      <div className="space-y-4">
         <div className="flex items-center justify-between px-2">
            <h2 className="text-lg font-black text-slate-800">Meal Windows</h2>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               <Clock className="w-3 h-3" /> 24h Format
            </div>
         </div>
         
         {[
           { key: "BREAKFAST", label: "Breakfast", color: "indigo", iconColor: "text-indigo-500", borderColor: "border-indigo-100", bgColor: "bg-indigo-500" },
           { key: "LUNCH", label: "Lunch", color: "orange", iconColor: "text-orange-500", borderColor: "border-orange-100", bgColor: "bg-orange-500" },
           { key: "DINNER", label: "Dinner", color: "purple", iconColor: "text-purple-500", borderColor: "border-purple-100", bgColor: "bg-purple-500" }
         ].map((m) => {
            const win = site.meal_windows[m.key] || { start: "00:00", end: "00:00" };
            return (
              <div key={m.key} className={`bg-white p-5 rounded-[24px] border ${m.borderColor} shadow-sm relative overflow-hidden`}>
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${m.bgColor}`}></div>
                <div className="flex justify-between items-center mb-4 ml-2">
                   <h3 className={`font-black text-slate-900 flex items-center gap-2 ${m.iconColor}`}>
                      {m.label}
                   </h3>
                </div>
                <div className="grid grid-cols-2 gap-4 ml-2">
                   <div>
                      <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-1.5 block">Start Time</label>
                      <input 
                        type="time" 
                        value={win.start} 
                        onChange={(e) => updateMealWindow(m.key, "start", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all" 
                      />
                   </div>
                   <div>
                      <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-1.5 block">End Time</label>
                      <input 
                        type="time" 
                        value={win.end} 
                        onChange={(e) => updateMealWindow(m.key, "end", e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all" 
                      />
                   </div>
                </div>
              </div>
            );
         })}
      </div>

      {/* Site Analytics section */}
      <div className="mt-8 space-y-4">
         <h2 className="text-lg font-black text-slate-800 ml-2">Site Activity Feed</h2>
         
         {!feed || feed.scans.length === 0 ? (
            <div className="bg-white rounded-[24px] p-8 text-center border border-slate-100">
               <p className="text-slate-400 font-bold text-sm">No scans recorded in last 24h</p>
            </div>
         ) : (
            <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-50">
               {feed.scans.map((scan) => (
                  <div key={scan.scan_id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-all group">
                     <div>
                       <h4 className="font-black text-slate-900 text-sm group-hover:text-indigo-600 transition-colors">
                         {scan.resident_info?.name || "Unknown Resident"}
                       </h4>
                       <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${scan.status === 'SUCCESS' ? 'text-emerald-500' : 'text-red-500'}`}>
                         {scan.meal_type} • {scan.status}
                       </p>
                     </div>
                     <span className="text-slate-400 text-[10px] font-bold">
                        {new Date(scan.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </span>
                  </div>
               ))}
            </div>
         )}
      </div>

      {/* Danger Zone */}
      <div className="border border-red-100 bg-red-50 rounded-[28px] p-6 mt-8">
         <div className="flex items-center gap-2 text-red-600 mb-4">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-black text-sm uppercase tracking-widest">Security Zone</h3>
         </div>
         <p className="text-xs text-red-800/60 font-medium mb-6">
            Deactivating a site will immediately prevent any vendor at this location from verifying meal scans. Existing logs will remain for billing.
         </p>
         <button 
           onClick={toggleSiteStatus}
           className={`w-full py-4 rounded-xl font-black text-sm transition-all active:scale-95 shadow-lg ${
             site.is_active ? 'bg-red-600 text-white shadow-red-200' : 'bg-emerald-600 text-white shadow-emerald-200'
           }`}
         >
            {site.is_active ? "Deactivate Site" : "Reactivate Site"}
         </button>
      </div>
    </div>
  );
}
