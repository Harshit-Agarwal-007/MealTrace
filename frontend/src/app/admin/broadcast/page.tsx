"use client";

/**
 * Admin Broadcast
 *
 * POST /admin/notifications/broadcast
 * GET  /admin/notifications/broadcast-history
 */

import { useState, useEffect, useCallback } from "react";
import { Send, ChevronLeft, Loader2, AlertCircle, CheckCircle2, History } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/apiClient";

type BroadcastLogRow = {
  id: string;
  title: string;
  message: string;
  site_id: string | null;
  recipient_count: number;
  stored_count: number;
  fcm_sent: number;
  fcm_failed: number;
  created_at: string | null;
};

type Site = {
  id: string;
  name: string;
  is_active: boolean;
};

export default function BroadcastPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [scope, setScope] = useState<"global" | "site">("site");
  const [sites, setSites] = useState<Site[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [selectedSiteId, setSelectedSiteId] = useState("");

  const [status, setStatus] = useState<"IDLE" | "SENDING" | "SUCCESS" | "ERROR">("IDLE");
  const [msg, setMsg] = useState("");

  const [history, setHistory] = useState<BroadcastLogRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const rows = await api.get<BroadcastLogRow[]>("/admin/notifications/broadcast-history?limit=10");
      setHistory(Array.isArray(rows) ? rows : []);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    setSitesLoading(true);
    api
      .get<{ sites: Site[] }>("/sites")
      .then((res) => setSites(Array.isArray(res.sites) ? res.sites : []))
      .catch(() => setSites([]))
      .finally(() => setSitesLoading(false));
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    if (scope === "site" && !selectedSiteId.trim()) return;

    setStatus("SENDING");
    try {
      const payload: { title: string; message: string; site_id?: string } = {
        title: title.trim(),
        message: body.trim(),
      };
      if (scope === "site") {
        payload.site_id = selectedSiteId.trim();
      }
      await api.post("/admin/notifications/broadcast", payload);
      setStatus("SUCCESS");
      setMsg("Broadcast sent successfully!");
      setTitle("");
      setBody("");
      await loadHistory();

      setTimeout(() => setStatus("IDLE"), 4000);
    } catch (err: unknown) {
      setStatus("ERROR");
      setMsg(err instanceof Error ? err.message : "Failed to send broadcast");
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
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Audience</label>
            <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-800">
                <input
                  type="radio"
                  name="broadcast-scope"
                  checked={scope === "site"}
                  onChange={() => setScope("site")}
                  className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                One site only
              </label>
              {scope === "site" && (
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  disabled={sitesLoading}
                  className="ml-6 w-[calc(100%-1.5rem)] rounded-lg border border-slate-200 bg-white py-2.5 px-3 text-sm font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="">{sitesLoading ? "Loading sites…" : "Select a site"}</option>
                  {sites
                    .filter((s) => s.is_active !== false)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name || s.id}
                      </option>
                    ))}
                </select>
              )}
              <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-800">
                <input
                  type="radio"
                  name="broadcast-scope"
                  checked={scope === "global"}
                  onChange={() => setScope("global")}
                  className="h-4 w-4 border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                All sites (every active resident)
              </label>
            </div>
            <p className="mt-1.5 text-xs font-medium text-slate-500">
              Site-specific sends only residents assigned to that site. Global sends every active resident across all sites.
            </p>
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
            disabled={
              status === "SENDING" ||
              !title.trim() ||
              !body.trim() ||
              (scope === "site" && !selectedSiteId.trim())
            }
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 mt-4 active:scale-95 transition-all"
          >
            {status === "SENDING" ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" /> Dispatch to Devices</>}
          </button>
        </form>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2 text-slate-800">
          <History className="h-5 w-5 text-indigo-600" />
          <h2 className="text-sm font-black">Recent broadcasts</h2>
        </div>
        {historyLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
          </div>
        ) : history.length === 0 ? (
          <p className="text-center text-sm font-medium text-slate-400 py-6">No sends logged yet. After you broadcast, they appear here.</p>
        ) : (
          <ul className="space-y-3 max-h-[420px] overflow-y-auto">
            {history.map((row) => {
              let when = "—";
              if (row.created_at) {
                try {
                  when = new Date(row.created_at).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  });
                } catch {
                  when = row.created_at;
                }
              }
              return (
                <li
                  key={row.id}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-left"
                >
                  <p className="text-xs font-bold text-slate-400">{when}</p>
                  <p className="mt-1 font-black text-slate-900">{row.title}</p>
                  <p className="mt-1 text-sm font-medium text-slate-600 line-clamp-3">{row.message}</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                    {row.recipient_count} residents · in-app {row.stored_count} · push {row.fcm_sent} ok / {row.fcm_failed} missed
                    {row.site_id
                      ? ` · ${sites.find((s) => s.id === row.site_id)?.name ?? row.site_id}`
                      : " · all sites"}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
