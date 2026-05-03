"use client";

import { useAuth } from "@/context/AuthContext";
import { UserCircle, LogOut, Mail, User, Key, Loader2, RefreshCw, MapPin } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/apiClient";
import type { VendorProfile, SiteInfo } from "@/lib/types";

export default function VendorProfile() {
  const { logout } = useAuth();
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const primarySiteLabel = useMemo(() => {
    if (!vendor?.assigned_site_ids?.length) return null;
    const firstId = vendor.assigned_site_ids[0];
    const match = sites.find((s) => s.id === firstId);
    return { id: firstId, name: match?.name ?? firstId };
  }, [vendor, sites]);

  const fetchProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const [vendorData, assigned] = await Promise.all([
        api.get<VendorProfile>("/vendor/profile"),
        api.get<{ sites: SiteInfo[] }>("/vendor/assigned-sites"),
      ]);
      setVendor(vendorData);
      setSites(assigned.sites ?? []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load vendor profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchProfile();
  }, []);

  return (
    <div className="relative min-h-[100dvh] overflow-y-auto bg-slate-50 px-6 pb-32 pt-10 text-slate-900 animate-in fade-in duration-500">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Device Profile</h1>
        <button
          type="button"
          onClick={() => void fetchProfile()}
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-500/25 transition-all active:scale-95 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      <div className="mb-6 flex flex-col items-center rounded-[28px] border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border border-indigo-100 bg-indigo-50">
          <UserCircle className="h-10 w-10 text-indigo-600" />
        </div>
        <p className="mt-3 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
          Signed in as vendor
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-900">Device details</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Kiosk name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  readOnly
                  value={vendor?.name ?? ""}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm font-semibold text-slate-900 [color-scheme:light]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">
                Contact email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  readOnly
                  value={vendor?.email ?? ""}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm font-semibold text-slate-900 [color-scheme:light]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-indigo-500" />
            <span className="font-semibold text-slate-800">Default site</span>
          </div>
          <span className="max-w-[55%] truncate rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-right text-[10px] font-bold uppercase tracking-wide text-indigo-700">
            {primarySiteLabel ? `${primarySiteLabel.name}` : "Unassigned"}
          </span>
        </div>

        <Link
          href="/forgot-password"
          className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <Key className="h-5 w-5 text-slate-400" />
            <span className="font-semibold text-slate-800">Change password</span>
          </div>
        </Link>

        <button
          type="button"
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-5 py-4 text-left font-bold text-red-600 transition-all hover:bg-red-100 active:scale-[0.99]"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <span className="text-sm">Log out session</span>
        </button>
      </div>
    </div>
  );
}
