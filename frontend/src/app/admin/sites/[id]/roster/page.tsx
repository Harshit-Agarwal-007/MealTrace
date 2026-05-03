"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Search,
  Users,
  Store,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/apiClient";
import type { ResidentProfile, SiteInfo, VendorProfile } from "@/lib/types";

export default function AdminSiteRosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: siteId } = use(params);
  const [site, setSite] = useState<SiteInfo | null>(null);
  const [residents, setResidents] = useState<ResidentProfile[]>([]);
  const [vendors, setVendors] = useState<VendorProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [siteData, resList, vendorRes] = await Promise.all([
        api.get<SiteInfo>(`/sites/${siteId}`),
        api.get<ResidentProfile[]>(`/admin/sites/${siteId}/residents`),
        api.get<{ vendors: VendorProfile[] }>(`/admin/vendors?site_id=${encodeURIComponent(siteId)}&page_size=100`),
      ]);
      setSite(siteData);
      setResidents(Array.isArray(resList) ? resList : []);
      setVendors(vendorRes.vendors ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load roster");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const q = query.trim().toLowerCase();

  const filteredResidents = useMemo(() => {
    if (!q) return residents;
    return residents.filter((r) => {
      const hay = `${r.name} ${r.email} ${r.phone ?? ""} ${r.room_number} ${r.id}`.toLowerCase();
      return hay.includes(q);
    });
  }, [residents, q]);

  const filteredVendors = useMemo(() => {
    if (!q) return vendors;
    return vendors.filter((v) => {
      const hay = `${v.name} ${v.email} ${v.phone ?? ""} ${v.id}`.toLowerCase();
      return hay.includes(q);
    });
  }, [vendors, q]);

  return (
    <div className="min-h-[80vh] space-y-6 px-6 pb-32 pt-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/admin/sites/${siteId}`}
          className="inline-flex items-center gap-1 font-black text-indigo-600 hover:text-indigo-700"
        >
          <ArrowLeft className="h-4 w-4" /> Site
        </Link>
        <button
          type="button"
          onClick={() => void fetchAll()}
          disabled={loading}
          className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-black text-slate-900">Site roster</h1>
        <p className="mt-1 text-sm font-medium text-slate-500">
          {site ? (
            <>
              <span className="font-bold text-slate-800">{site.name}</span>
              <span className="ml-2 font-mono text-xs text-slate-400">{site.id}</span>
            </>
          ) : (
            <span className="font-mono text-xs">{siteId}</span>
          )}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Residents from <code className="rounded bg-slate-100 px-1">GET /admin/sites/…/residents</code>; vendors from{" "}
          <code className="rounded bg-slate-100 px-1">GET /admin/vendors?site_id=…</code>.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, phone, room, id…"
          className="w-full rounded-[20px] border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}

      {loading && !residents.length && !vendors.length ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        </div>
      ) : (
        <>
          <section>
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-black text-slate-900">Residents</h2>
              <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                {filteredResidents.length}
              </span>
            </div>
            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
              {filteredResidents.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">No residents match this site or search.</p>
              ) : (
                filteredResidents.map((r, i) => (
                  <Link key={r.id} href={`/admin/residents/${r.id}`} className="block">
                    <div
                      className={`flex items-center justify-between p-4 hover:bg-slate-50 ${i ? "border-t border-slate-100" : ""}`}
                    >
                      <div>
                        <p className="font-bold text-slate-900">{r.name}</p>
                        <p className="text-xs text-slate-500">{r.email}</p>
                        {r.room_number && (
                          <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Room {r.room_number}
                          </p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Store className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-black text-slate-900">Vendors on this site</h2>
              <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-bold text-orange-700">
                {filteredVendors.length}
              </span>
            </div>
            <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
              {filteredVendors.length === 0 ? (
                <p className="p-6 text-center text-sm text-slate-500">No vendors assigned to this site.</p>
              ) : (
                filteredVendors.map((v, i) => (
                  <Link key={v.id} href={`/admin/vendors/${v.id}`} className="block">
                    <div
                      className={`flex items-center justify-between p-4 hover:bg-slate-50 ${i ? "border-t border-slate-100" : ""}`}
                    >
                      <div>
                        <p className="font-bold text-slate-900">{v.name}</p>
                        <p className="text-xs text-slate-500">{v.email}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
