"use client";
import { UserPlus, Activity, Database, AlertCircle, LogOut } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function AdminDashboard() {
  const { logout } = useAuth();
  
  const kpis = [
    { id: 1, label: "Total Scans Today", value: "1,248" },
    { id: 2, label: "Active Plans", value: "450" },
  ];

  const recentScans = [
    { id: 1, name: "Arjun Mehta", site: "Main Cafeteria", status: "SUCCESS", time: "Just now" },
    { id: 2, name: "Priya Sharma", site: "Hostel B Mess", status: "SUCCESS", time: "2 min ago" },
    { id: 3, name: "Rohan Kapoor", site: "Main Cafeteria", status: "BLOCKED", reason: "Zero Balance", time: "5 min ago" },
    { id: 4, name: "Sneha Reddy", site: "Admin Snacks", status: "SUCCESS", time: "10 min ago" },
  ];

  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500 space-y-8">
        <div className="flex justify-between items-center">
          <div>
             <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-indigo-600">Admin Dashboard</h1>
             <p className="text-slate-500 font-medium text-sm mt-1">Live metrics and operations</p>
          </div>
          <button onClick={logout} className="p-2.5 bg-red-50 text-red-600 rounded-full hover:bg-red-100 transition-colors">
             <LogOut className="w-5 h-5" />
          </button>
        </div>

        {/* Global Unified Search */}
        <div className="relative">
           <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
           </svg>
           <input 
             type="text" 
             placeholder="Global Search (Residents, Sites, Vendors)..." 
             className="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-slate-900 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all font-medium shadow-sm"
           />
        </div>

       {/* KPIs */}
       <div className="grid grid-cols-2 gap-4">
         {kpis.map(kpi => (
           <div key={kpi.id} className="bg-white rounded-[24px] p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
             <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{kpi.label}</p>
             <p className="text-3xl font-black text-slate-800">{kpi.value}</p>
           </div>
         ))}
       </div>

       {/* Quick Actions */}
       <div className="grid grid-cols-5 gap-3">
          <Link href="/admin/residents" className="bg-blue-50 text-blue-700 p-4 rounded-[20px] flex flex-col items-center gap-2 border border-blue-100 hover:bg-blue-100 transition-colors shadow-sm text-center">
             <UserPlus className="w-5 h-5" />
             <span className="text-[10px] font-bold uppercase leading-tight">Users</span>
          </Link>
          <Link href="/admin/vendors" className="bg-amber-50 text-amber-700 p-4 rounded-[20px] flex flex-col items-center gap-2 border border-amber-100 hover:bg-amber-100 transition-colors shadow-sm text-center">
             <AlertCircle className="w-5 h-5" />
             <span className="text-[10px] font-bold uppercase leading-tight">Vendors</span>
          </Link>
          <Link href="/admin/plans" className="bg-purple-50 text-purple-700 p-4 rounded-[20px] flex flex-col items-center gap-2 border border-purple-100 hover:bg-purple-100 transition-colors shadow-sm text-center">
             <Database className="w-5 h-5" />
             <span className="text-[10px] font-bold uppercase leading-tight">Plans</span>
          </Link>
          <Link href="/admin/broadcast" className="bg-rose-50 text-rose-700 p-4 rounded-[20px] flex flex-col items-center gap-2 border border-rose-100 hover:bg-rose-100 transition-colors shadow-sm text-center">
             <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
             <span className="text-[10px] font-bold uppercase leading-tight">Broadcast</span>
          </Link>
          <Link href="/admin/payments" className="bg-emerald-50 text-emerald-700 p-4 rounded-[20px] flex flex-col items-center gap-2 border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm text-center">
             <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7"/></svg>
             <span className="text-[10px] font-bold uppercase leading-tight">Payments</span>
          </Link>
       </div>

       {/* Live Feed */}
       <div>
         <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
               <Activity className="w-5 h-5 text-blue-600 animate-pulse" />
               Live Scan Feed
            </h2>
         </div>
         <div className="bg-white rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 overflow-hidden divide-y divide-slate-50">
            {recentScans.map(scan => (
              <div key={scan.id} className="p-4 flex justify-between items-center hover:bg-slate-50 transition-colors">
                 <div>
                   <h3 className="font-bold text-slate-900 text-sm">{scan.name}</h3>
                   <p className="text-slate-500 text-xs">{scan.site}</p>
                 </div>
                 <div className="text-right">
                    {scan.status === "SUCCESS" ? (
                      <span className="text-emerald-600 font-bold text-[10px] uppercase bg-emerald-50 px-2 py-1 rounded-md">Success</span>
                    ) : (
                      <span className="text-red-600 font-bold text-[10px] uppercase bg-red-50 px-2 py-1 rounded-md">{scan.reason}</span>
                    )}
                    <p className="text-slate-400 text-[10px] mt-1">{scan.time}</p>
                 </div>
              </div>
            ))}
         </div>
       </div>
    </div>
  )
}
