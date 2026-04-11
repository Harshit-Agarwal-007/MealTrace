"use client";
import { ArrowLeft, Download, FileSpreadsheet, FileText } from "lucide-react";
import Link from "next/link";

export default function AdminReports() {
  const reports = [
    { title: "Weekly Scans Summary", type: "CSV", icon: <FileSpreadsheet /> },
    { title: "Financial Monthly Output", type: "XLSX", icon: <FileSpreadsheet /> },
    { title: "Exception & Overrides Log", type: "CSV", icon: <FileSpreadsheet /> },
    { title: "Active Residents Roster", type: "PDF", icon: <FileText /> },
  ];

  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500 space-y-6">
      <Link href="/admin" className="inline-flex items-center text-blue-600 font-bold hover:text-blue-700 transition-colors mb-2">
         <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
      </Link>
      <h1 className="text-2xl font-bold text-slate-900">System Reports</h1>
      <p className="text-slate-500 mb-6">Download data exports for accounting and auditing.</p>

      <div className="grid gap-4">
        {reports.map((report, i) => (
           <div key={i} className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow group cursor-pointer">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                    {report.icon}
                 </div>
                 <div>
                    <h3 className="font-bold text-slate-900">{report.title}</h3>
                    <span className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase px-2 py-0.5 rounded mt-1 inline-block">{report.type} File</span>
                 </div>
              </div>
              <button className="p-2.5 bg-slate-50 rounded-full text-slate-400 group-hover:text-blue-600 group-hover:bg-blue-50 transition-colors">
                 <Download className="w-5 h-5" />
              </button>
           </div>
        ))}
      </div>
    </div>
  )
}
