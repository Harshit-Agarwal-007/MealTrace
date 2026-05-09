"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, CheckCircle2 } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { ConsumerConfigResponse } from "@/lib/types";

export default function AdminConsumerSettingsPage() {
  const [cfg, setCfg] = useState<ConsumerConfigResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<ConsumerConfigResponse>("/admin/consumer-config");
      setCfg({
        ...data,
        default_guest_pass_validity_hours: data.default_guest_pass_validity_hours ?? 48,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!cfg) return;
    setSaving(true);
    setSuccess(false);
    setError(null);
    try {
      const updated = await api.patch<ConsumerConfigResponse>("/admin/consumer-config", {
        plans_globally_enabled: cfg.plans_globally_enabled,
        guest_pass_globally_enabled: cfg.guest_pass_globally_enabled,
        default_guest_pass_price_inr: cfg.default_guest_pass_price_inr,
        default_guest_pass_validity_hours: cfg.default_guest_pass_validity_hours,
      });
      setCfg(updated);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !cfg) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 p-6">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
        <p className="text-sm font-bold text-slate-500">Loading store settings…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-6 p-6 pb-28 pt-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <Link href="/admin" className="inline-flex items-center text-sm font-black text-indigo-600 hover:opacity-80">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Dashboard
        </Link>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2.5 text-xs font-black text-white shadow-lg disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Save
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-black text-slate-900">Resident store (global)</h1>
        <p className="mt-1 text-sm text-slate-500">
          Applies to every site unless a site overrides guest price or hides plans. Per-site rules are on each{" "}
          <Link href="/admin/sites" className="font-bold text-indigo-600 underline">
            site
          </Link>
          .
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          <CheckCircle2 className="h-5 w-5" />
          Saved
        </div>
      )}

      <div className="space-y-3 rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <button
          type="button"
          onClick={() => setCfg({ ...cfg, plans_globally_enabled: !cfg.plans_globally_enabled })}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-left"
        >
          <div>
            <p className="text-sm font-black text-slate-900">Plans enabled (all sites)</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Master switch for plan checkout</p>
          </div>
          <div
            className={`relative h-6 w-12 shrink-0 rounded-full shadow-inner ${cfg.plans_globally_enabled ? "bg-emerald-500" : "bg-slate-300"}`}
          >
            <div
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all ${
                cfg.plans_globally_enabled ? "right-0.5" : "left-0.5"
              }`}
            />
          </div>
        </button>

        <button
          type="button"
          onClick={() => setCfg({ ...cfg, guest_pass_globally_enabled: !cfg.guest_pass_globally_enabled })}
          className="flex w-full items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-left"
        >
          <div>
            <p className="text-sm font-black text-slate-900">Guest passes enabled (all sites)</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Master switch for guest pass checkout</p>
          </div>
          <div
            className={`relative h-6 w-12 shrink-0 rounded-full shadow-inner ${
              cfg.guest_pass_globally_enabled ? "bg-emerald-500" : "bg-slate-300"
            }`}
          >
            <div
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all ${
                cfg.guest_pass_globally_enabled ? "right-0.5" : "left-0.5"
              }`}
            />
          </div>
        </button>

        <div>
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Default guest pass price (INR)
          </label>
          <input
            type="number"
            min={1}
            value={cfg.default_guest_pass_price_inr}
            onChange={(e) =>
              setCfg({ ...cfg, default_guest_pass_price_inr: Math.max(1, parseInt(e.target.value, 10) || 1) })
            }
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <p className="mt-1 text-[10px] text-slate-400">Sites can override this on the site detail page.</p>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-slate-400">
            Default guest pass validity (hours)
          </label>
          <input
            type="number"
            min={1}
            max={8760}
            value={cfg.default_guest_pass_validity_hours ?? 48}
            onChange={(e) =>
              setCfg({
                ...cfg,
                default_guest_pass_validity_hours: Math.min(
                  8760,
                  Math.max(1, parseInt(e.target.value, 10) || 48)
                ),
              })
            }
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <p className="mt-1 text-[10px] text-slate-400">
            Default is 48 hours (2 days). Max 8760 (1 year). Each site can set its own override.
          </p>
        </div>
      </div>
    </div>
  );
}
