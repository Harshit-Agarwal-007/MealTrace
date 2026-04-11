"use client";

import { Utensils, CheckCircle2, XCircle } from "lucide-react";

export default function ResidentHistory() {
  const transactions = [
    { id: 1, site: "Main Cafeteria", type: "Lunch", time: "Today, 1:05 PM", status: "SUCCESS", amount: 1 },
    { id: 2, site: "Hostel B Mess", type: "Dinner", time: "Yesterday, 8:30 PM", status: "SUCCESS", amount: 1 },
    { id: 3, site: "Main Cafeteria", type: "Lunch", time: "Yesterday, 1:15 PM", status: "BLOCKED", reason: "Outside Window", amount: 0 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-white mb-6">
        <h1 className="text-2xl font-bold">History</h1>
        <p className="text-indigo-100 text-sm">Your recent meal scans</p>
      </div>

      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-gray-200/50 border border-gray-100 space-y-4">
        {transactions.map((tx) => (
          <div key={tx.id} className="flex flex-row items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-100 hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-full ${tx.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-600 shadow-emerald-500/20' : 'bg-red-100 text-red-600 shadow-red-500/20'} shadow-sm`}>
                <Utensils className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 leading-tight">{tx.type}</h3>
                <p className="text-xs text-gray-500">{tx.site} • {tx.time}</p>
                {tx.status === 'BLOCKED' && <p className="text-xs font-semibold text-red-500 mt-1 bg-red-50 inline-block px-1.5 py-0.5 rounded">{tx.reason}</p>}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className={`font-black text-lg ${tx.status === 'SUCCESS' ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                {tx.amount === 0 ? '-' : `-${tx.amount}`}
              </span>
              <div className="flex items-center gap-1 mt-1">
                {tx.status === 'SUCCESS' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-red-500" />}
                <span className={`text-[10px] font-bold ${tx.status === 'SUCCESS' ? 'text-emerald-600' : 'text-red-500'}`}>{tx.status}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
