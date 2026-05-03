"use client";

import { useState, useEffect, useCallback, use } from "react";
import {
  ArrowLeft,
  Clock,
  Save,
  Loader2,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Users,
} from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import type { PlanInfo, SiteInfo } from "@/lib/types";

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
  const [allPlans, setAllPlans] = useState<PlanInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [siteData, feedData, plansData] = await Promise.all([
        api.get<SiteInfo>(`/sites/${id}`),
        api.get<SiteScanFeed>(`/admin/sites/${id}/live-scans?hours=24`),
        api.get<PlanInfo[]>("/admin/plans"),
      ]);
      setSite(siteData);
      setFeed(feedData);
      setAllPlans(Array.isArray(plansData) ? plansData : []);
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
        meal_windows: site.meal_windows,
        resident_plans_enabled: site.resident_plans_enabled ?? true,
        resident_guest_pass_enabled: site.resident_guest_pass_enabled ?? true,
        guest_pass_price_inr: site.guest_pass_price_inr ?? null,
        hidden_plan_ids: site.hidden_plan_ids ?? [],
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
    const windows = { ...(site.meal_windows ?? {}) };
    if (!windows[meal]) {
      windows[meal] = { start: "00:00", end: "00:00" };
    }
    windows[meal] = { ...windows[meal]!, [field]: value };
    setSite({ ...site, meal_windows: windows });
  };

  const toggleSiteStatus = () => {
    if (!site) return;
    setSite({ ...site, is_active: !site.is_active });
  };

  const toggleHiddenPlan = (planId: string) => {
    if (!site) return;
    const cur = new Set(site.hidden_plan_ids ?? []);
    if (cur.has(planId)) cur.delete(planId);
    else cur.add(planId);
    setSite({ ...site, hidden_plan_ids: Array.from(cur) });
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
         <Link
           href={`/admin/sites/${id}/roster`}
           className="mb-4 flex w-full items-center justify-between rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-black text-indigo-800 transition-colors hover:bg-indigo-100"
         >
           <span className="flex items-center gap-2">
             <Users className="h-5 w-5" />
             Residents &amp; vendors at this site
           </span>
           <span className="text-xs font-bold opacity-80">Open</span>
         </Link>
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

      {/* Resident storefront (per site) */}
      <div className="space-y-4">
        <h2 className="ml-2 text-lg font-black text-slate-800">Resident storefront</h2>
        <p className="px-2 text-xs font-medium text-slate-500">
          Control meal-plan checkout and guest passes for this site. Global defaults live under{" "}
          <Link href="/admin/consumer" className="font-bold text-indigo-600 underline">
            Store settings
          </Link>
          .
        </p>
        <div className="space-y-3 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <button
            type="button"
            onClick={() => site && setSite({ ...site, resident_plans_enabled: !(site.resident_plans_enabled ?? true) })}
            className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-left transition-colors hover:bg-slate-50"
          >
            <div>
              <p className="text-sm font-black text-slate-900">Allow plan purchases</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Top-up plans in resident app</p>
            </div>
            <div
              className={`relative h-6 w-12 shrink-0 rounded-full shadow-inner transition-colors ${
                site.resident_plans_enabled ?? true ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all ${
                  site.resident_plans_enabled ?? true ? "right-0.5" : "left-0.5"
                }`}
              />
            </div>
          </button>
          <button
            type="button"
            onClick={() =>
              site && setSite({ ...site, resident_guest_pass_enabled: !(site.resident_guest_pass_enabled ?? true) })
            }
            className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-left transition-colors hover:bg-slate-50"
          >
            <div>
              <p className="text-sm font-black text-slate-900">Allow guest passes</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Paid one-meal QR for residents</p>
            </div>
            <div
              className={`relative h-6 w-12 shrink-0 rounded-full shadow-inner transition-colors ${
                site.resident_guest_pass_enabled ?? true ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all ${
                  site.resident_guest_pass_enabled ?? true ? "right-0.5" : "left-0.5"
                }`}
              />
            </div>
          </button>
          <div>
            <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
              Guest pass price (INR, optional)
            </label>
            <input
              type="number"
              min={1}
              placeholder="Use global default"
              value={site.guest_pass_price_inr != null ? site.guest_pass_price_inr : ""}
              onChange={(e) => {
                const v = e.target.value;
                setSite({
                  ...site,
                  guest_pass_price_inr: v === "" ? null : Math.max(1, parseInt(v, 10) || 1),
                });
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            />
            <p className="mt-1 text-[10px] text-slate-400">Leave empty to use the global default from store settings.</p>
          </div>
          {allPlans.filter((p) => p.is_active !== false).length > 0 ? (
            <div className="border-t border-slate-100 pt-4">
              <p className="mb-2 text-xs font-bold text-slate-700">Hide specific plans at this site</p>
              <div className="max-h-48 space-y-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                {allPlans
                  .filter((p) => p.is_active !== false)
                  .map((p) => {
                    const hidden = (site.hidden_plan_ids ?? []).includes(p.id);
                    return (
                      <label key={p.id} className="flex cursor-pointer items-center gap-3 text-sm font-semibold text-slate-800">
                        <input
                          type="checkbox"
                          checked={hidden}
                          onChange={() => toggleHiddenPlan(p.id)}
                          className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {p.name}{" "}
                          <span className="font-mono text-[10px] text-slate-400">({p.id})</span>
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>
          ) : null}
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
            const win = (site.meal_windows ?? {})[m.key] ?? { start: "00:00", end: "00:00" };
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
