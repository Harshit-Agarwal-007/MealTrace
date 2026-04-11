"use client";

/**
 * Admin Dashboard — MealTrace
 *
 * Polling interval: 15s
 *  - GET /admin/dashboard/stats
 *  - GET /admin/dashboard/scan-feed
 */

import { UserPlus, Activity, Database, LogOut, CheckCircle2, XCircle, Search, Gift, IndianRupee } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { api } from "@/lib/apiClient";
import type { DashboardStats, ScanFeedEntry } from "@/lib/types";

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [scans, setScans] = useState<ScanFeedEntry[]>([]);
  const [globalSearch, setGlobalSearch] = useState("");

  const fetchData = async () => {
    try {
      const [_stats, _scans] = await Promise.all([
        api.get<DashboardStats>("/admin/dashboard/stats"),
        api.get<{ feed: ScanFeedEntry[] }>("/admin/dashboard/scan-feed?limit=10"),
      ]);
      setStats(_stats);
      setScans(_scans.feed || []);
    } catch (e) {
      console.error("Dashboard poll failed");
    }
  };

  useEffect(() => {
    fetchData(); // Initial load
    const interval = setInterval(fetchData, 15000); // 15s poll
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 pt-safe pb-28 animate-in fade-in duration-500 space-y-6">
      <div className="flex justify-between items-center mb-2">
        <div>
           <h1 className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">Admin Dashboard</h1>
           <p className="text-slate-400 font-bold text-xs mt-0.5 uppercase tracking-wider">Live View</p>
        </div>
        <button onClick={logout} className="p-2.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors">
           <LogOut className="w-4 h-4" />
        </button>
      </div>

      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input 
          type="text" 
          value={globalSearch}
          onChange={(e) => setGlobalSearch(e.target.value)}
          placeholder="Global Search (ID, Name, or Phone)..."
          className="w-full bg-white border border-slate-200 py-3.5 pl-11 pr-4 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
         <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Today Scans</p>
            <p className="text-3xl font-black text-slate-800">{stats?.today_total_scans ?? "—"}</p>
         </div>
         <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Active Users</p>
            <p className="text-3xl font-black text-slate-800">{stats?.active_residents ?? "—"}</p>
         </div>
      </div>

      <div>
         <h2 className="text-sm font-bold text-slate-800 mb-3 ml-1">Quick Actions</h2>
         <div className="grid grid-cols-3 gap-3">
           <Link href="/admin/residents/new" className="bg-blue-50 text-blue-700 p-4 rounded-2xl flex flex-col items-center gap-2 border border-blue-100 hover:bg-blue-100 transition-colors">
              <UserPlus className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase">Add User</span>
           </Link>
           <Link href="/admin/broadcast" className="bg-purple-50 text-purple-700 p-4 rounded-2xl flex flex-col items-center gap-2 border border-purple-100 hover:bg-purple-100 transition-colors">
              <Activity className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase">Broadcast</span>
           </Link>
           <Link href="/admin/payments" className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl flex flex-col items-center gap-2 border border-emerald-100 hover:bg-emerald-100 transition-colors">
              <IndianRupee className="w-5 h-5" />
              <span className="text-[10px] font-bold uppercase">Payments</span>
           </Link>
         </div>
      </div>

      <div>
         <div className="flex items-center justify-between mb-3 ml-1">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Feed
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase">Updates 15s</p>
         </div>
         
         <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden flex flex-col divide-y divide-slate-50">
            {scans.length === 0 ? (
               <div className="p-8 text-center text-slate-400 text-xs font-bold uppercase">No scans today</div>
            ) : (
               scans.map(scan => (
                 <div key={scan.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3">
                       {scan.status === "SUCCESS" ? (
                          <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600"><CheckCircle2 className="w-4 h-4"/></div>
                       ) : (
                          <div className="bg-red-100 p-2 rounded-xl text-red-600"><XCircle className="w-4 h-4"/></div>
                       )}
                       <div>
                          <p className="font-bold text-slate-800 text-xs lg:text-sm">{scan.resident_name || "Unknown"}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                             <p className="text-[10px] text-slate-400 uppercase">{scan.site_id} • {new Date(scan.timestamp).toLocaleTimeString("en-IN", { timeStyle: "short" })}</p>
                             {scan.is_guest_pass && (
                                <span className="bg-purple-100 text-purple-600 text-[9px] font-bold px-1.5 py-0.5 rounded-sm flex items-center gap-0.5"><Gift className="w-2.5 h-2.5"/> VIP</span>
                             )}
                          </div>
                          {scan.status === "BLOCKED" && scan.block_reason && (
                            <p className="text-[10px] font-bold text-red-500 mt-0.5 bg-red-50 inline-block px-1 rounded">{scan.block_reason}</p>
                          )}
                       </div>
                    </div>
                 </div>
               ))
            )}
         </div>
      </div>
    </div>
  );
}
