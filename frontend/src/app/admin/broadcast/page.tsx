"use client";

/**
 * Admin Broadcast
 *
 * POST /admin/broadcast
 */

import { useState } from "react";
import { Send, ChevronLeft, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/apiClient";

export default function BroadcastPage() {
  const [target, setTarget] = useState("ALL");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  
  const [status, setStatus] = useState<"IDLE" | "SENDING" | "SUCCESS" | "ERROR">("IDLE");
  const [msg, setMsg] = useState("");

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    
    setStatus("SENDING");
    try {
      await api.post("/admin/broadcast", {
        target_role: target === "ALL" ? null : target,
        title: title.trim(),
        message: body.trim()
      });
      setStatus("SUCCESS");
      setMsg("Broadcast sent successfully!");
      setTitle("");
      setBody("");
      
      setTimeout(() => setStatus("IDLE"), 4000);
    } catch (err: any) {
      setStatus("ERROR");
      setMsg(err.message || "Failed to send broadcast");
    }
  };

  return (
    <div className="p-6 pt-safe pb-28 animate-in fade-in space-y-6">
      <div className="flex items-center gap-4 mb-2">
        <Link href="/admin" className="bg-white p-2.5 rounded-full shadow-sm border border-slate-100">
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </Link>
        <h1 className="text-xl font-black text-slate-900">Push Broadcast</h1>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <form onSubmit={handleSend} className="space-y-4">
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Target Audience</label>
              <select 
                value={target} 
                onChange={(e) => setTarget(e.target.value)} 
                className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              >
                  <option value="ALL">Everyone Active</option>
                  <option value="RESIDENT">All Residents</option>
                  <option value="VENDOR">All Vendors</option>
              </select>
           </div>
           
           <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Title (Short)</label>
              <input 
                type="text" 
                maxLength={40}
                required
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="e.g., Main Cafeteria Closed Today"
                className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" 
              />
           </div>

           <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Message Body</label>
              <textarea 
                required
                value={body} 
                onChange={(e) => setBody(e.target.value)} 
                rows={4}
                placeholder="Give details here..."
                className="w-full bg-slate-50 border border-slate-200 py-3 px-4 rounded-xl font-medium focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none" 
              />
           </div>

           {status === "SUCCESS" && (
              <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-sm font-bold">
                 <CheckCircle2 className="w-5 h-5" /> {msg}
              </div>
           )}

           {status === "ERROR" && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 text-sm font-bold">
                 <AlertCircle className="w-5 h-5" /> {msg}
              </div>
           )}

           <button 
             disabled={status === "SENDING" || !title.trim() || !body.trim()} 
             className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 mt-4 active:scale-95 transition-all"
           >
              {status === "SENDING" ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Dispatch to Devices</>}
           </button>
        </form>
      </div>
    </div>
  );
}
