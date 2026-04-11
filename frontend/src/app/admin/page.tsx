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
       <div className="grid grid-cols-4 gap-3">
          <Link href="/admin/residents" className="bg-blue-50 text-blue-700 p-4 rounded-[20px] flex flex-col items-center gap-2 border border-blue-100 hover:bg-blue-100 transition-colors shadow-sm">
             <UserPlus className="w-5 h-5" />
             <span className="text-[10px] font-bold uppercase">Users</span>
          </Link>
          <Link href="/admin/reports" className="bg-emerald-50 text-emerald-700 p-4 rounded-[20px] flex flex-col items-center gap-2 border border-emerald-100 hover:bg-emerald-100 transition-colors shadow-sm">
             <Database className="w-5 h-5" />
             <span className="text-[10px] font-bold uppercase">Export</span>
          </Link>
          <Link href="/admin/vendors" className="bg-amber-50 text-amber-700 p-4 rounded-[20px] flex flex-col items-center gap-2 border border-amber-100 hover:bg-amber-100 transition-colors shadow-sm">
             <AlertCircle className="w-5 h-5" />
             <span className="text-[10px] font-bold uppercase">Vendors</span>
          </Link>
          <Link href="/admin/plans" className="bg-purple-50 text-purple-700 p-4 rounded-[20px] flex flex-col items-center gap-2 border border-purple-100 hover:bg-purple-100 transition-colors shadow-sm">
             <Database className="w-5 h-5" />
             <span className="text-[10px] font-bold uppercase">Plans</span>
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
