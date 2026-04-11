"use client";

/**
 * Resident History Page
 *
 * GET /resident/transactions
 * Fetches transaction history (meal scans, physical scans, plan purchases).
 */

import { useState, useEffect } from "react";
import { Coffee, ArrowRight, Loader2, IndianRupee, Tag, AlertCircle } from "lucide-react";
import { api } from "@/lib/apiClient";

interface Transaction {
  id: string;
  type: "SCAN" | "MANUAL" | "PAYMENT" | "CREDIT_OVERRIDE";
  amount?: number;
  tokens_deducted?: number;
  status: "SUCCESS" | "BLOCKED" | "PENDING" | "FAILED";
  timestamp: string;
  description: string;
}

const statusColor = (status: Transaction["status"]) => {
  switch (status) {
    case "SUCCESS": return "text-emerald-600 bg-emerald-50";
    case "BLOCKED":
    case "FAILED": return "text-red-600 bg-red-50";
    case "PENDING": return "text-amber-600 bg-amber-50";
    default: return "text-slate-600 bg-slate-50";
  }
};

const typeIcon = (type: Transaction["type"]) => {
  switch(type) {
    case "SCAN": return <Coffee className="w-5 h-5 text-indigo-500" />;
    case "MANUAL": return <Tag className="w-5 h-5 text-amber-500" />;
    case "PAYMENT": return <IndianRupee className="w-5 h-5 text-emerald-500" />;
    case "CREDIT_OVERRIDE": return <AlertCircle className="w-5 h-5 text-purple-500" />;
    default: return <ArrowRight className="w-5 h-5 text-slate-500" />;
  }
};

export default function ResidentHistoryPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ transactions: Transaction[] }>("/resident/transactions")
      .then(res => setTxs(res.transactions))
      .catch(() => setTxs([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 pt-8 pb-24 animate-in fade-in duration-500">
      <h1 className="text-2xl font-black text-gray-900 mb-6">History</h1>
      
      {loading ? (
        <div className="flex h-32 items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500"/></div>
      ) : txs.length === 0 ? (
        <div className="text-center p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
           <p className="text-gray-500 font-medium">No transactions yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {txs.map((tx) => (
            <div key={tx.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-gray-50 p-3 rounded-2xl flex-shrink-0">
                  {typeIcon(tx.type)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">{tx.description}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{new Date(tx.timestamp).toLocaleString("en-IN", { timeStyle: 'short', dateStyle: 'medium'})}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-black text-gray-900">
                  {tx.amount ? `₹${tx.amount/100}` : tx.tokens_deducted ? `-${tx.tokens_deducted} cr` : ""}
                </p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full mt-1 inline-block ${statusColor(tx.status)}`}>
                  {tx.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
