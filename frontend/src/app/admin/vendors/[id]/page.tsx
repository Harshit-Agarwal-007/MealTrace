"use client";

import { useState, useEffect, useCallback, use } from "react";
import { 
  ArrowLeft, Save, MapPin, KeyRound, Trash2, 
  AlertTriangle, Loader2, CheckCircle2, RefreshCw,
  Store, Phone, Mail
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";
import type { VendorProfile, SiteInfo } from "@/lib/types";

export default function AdminVendorDetail({ params }: { params: Promise<{id: string}> }) {
  const { id } = use(params);
  const router = useRouter();
  
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [success, setSuccess] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [vendorData, sitesData] = await Promise.all([
        api.get<VendorProfile>(`/admin/vendors/${id}`),
        api.get<{ sites: SiteInfo[] }>("/sites")
      ]);
      setVendor(vendorData);
      setSites(sitesData.sites || []);
    } catch (err: any) {
      setError(err.message || "Failed to load vendor data");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!vendor) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await api.patch(`/admin/vendors/${id}`, {
        name: vendor.name,
        phone: vendor.phone,
        assigned_site_ids: vendor.assigned_site_ids,
        status: vendor.status
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update vendor settings");
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async () => {
    if (!vendor) return;
    setRevoking(true);
    try {
      await api.delete(`/admin/vendors/${id}`);
      setShowRevokeModal(false);
      router.push("/admin/vendors");
    } catch (err: any) {
      setError(err.message || "Failed to revoke vendor access");
    } finally {
      setRevoking(false);
    }
  };

  const updateVendor = (field: keyof VendorProfile, val: any) => {
    if (vendor) setVendor({ ...vendor, [field]: val });
  };

  const toggleSite = (siteId: string) => {
    if (!vendor) return;
    const current = [...vendor.assigned_site_ids];
    if (current.includes(siteId)) {
      updateVendor("assigned_site_ids", current.filter(cid => cid !== siteId));
    } else {
      updateVendor("assigned_site_ids", [...current, siteId]);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-10 h-10 text-orange-500 animate-spin" />
        <p className="text-slate-500 font-bold tracking-widest uppercase text-xs">Authenticating Vendor Profile...</p>
      </div>
    );
  }

  if (error && !vendor) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-[32px] border border-red-100 font-bold max-w-sm mx-auto">
          {error}
        </div>
        <button onClick={() => fetchData()} className="text-orange-600 font-black flex items-center gap-2 mx-auto">
          <RefreshCw className="w-4 h-4" /> Reload
        </button>
      </div>
    );
  }

  if (!vendor) return null;

  return (
    <div className="p-6 pt-8 pb-32 animate-in fade-in duration-500 space-y-6 max-w-lg mx-auto">
      {/* Revoke Access Modal */}
      {showRevokeModal && (
         <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-200 text-center">
               <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <AlertTriangle className="w-10 h-10 text-red-600" />
               </div>
               <h3 className="text-2xl font-black text-slate-900 mb-3">Terminate Access?</h3>
               <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed">
                  The vendor session will be terminated and they will be unable to verify meal scans immediately.
               </p>
               <div className="flex flex-col gap-3">
                  <button 
                    onClick={handleRevoke}
                    disabled={revoking}
                    className="w-full bg-red-600 font-black text-white py-4 rounded-2xl hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                     {revoking ? <Loader2 className="w-5 h-5 animate-spin" /> : "Deactivate & Revoke"}
                  </button>
                  <button 
                    onClick={() => setShowRevokeModal(false)}
                    className="w-full bg-slate-50 font-black text-slate-500 py-4 rounded-2xl hover:bg-slate-100 transition-all"
                  >
                    Cancel
                  </button>
               </div>
            </div>
         </div>
      )}

      {/* Header Actions */}
      <div className="flex justify-between items-center mb-2">
         <Link href="/admin/vendors" className="bg-white p-3 rounded-full shadow-sm border border-slate-100 hover:opacity-75 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
         </Link>
         <button 
           onClick={() => handleSave()}
           disabled={saving}
           className="bg-slate-900 text-white px-6 py-2.5 rounded-full text-xs font-black flex items-center gap-2 active:scale-95 transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
         >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            {saving ? "Updating..." : "Save Settings"}
         </button>
      </div>

      {/* Feedback Overlay */}
      {success && (
        <div className="bg-emerald-50 text-emerald-700 p-4 rounded-2xl border border-emerald-100 flex items-center gap-3 animate-in slide-in-from-top duration-300">
           <CheckCircle2 className="w-5 h-5" />
           <p className="text-sm font-black">Vendor settings updated</p>
        </div>
      )}
      
      {/* Vendor Profile UI */}
      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 relative">
         <div className="flex items-center gap-5 mb-8">
            <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-3xl flex items-center justify-center">
               <Store className="w-8 h-8" />
            </div>
            <div className="flex-1">
               <input 
                 value={vendor.name}
                 onChange={e => updateVendor("name", e.target.value)}
                 className="text-2xl font-black text-slate-900 w-full focus:outline-none border-b border-transparent focus:border-orange-500 bg-transparent transition-all" 
               />
               <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${vendor.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-400'}`}></span>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{vendor.status}</p>
               </div>
            </div>
         </div>

         <div className="space-y-4">
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
               <Mail className="w-5 h-5 text-slate-400 shrink-0" />
               <div className="min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Contact Email</p>
                  <p className="text-sm font-bold text-slate-900 truncate">{vendor.email}</p>
               </div>
            </div>
            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 focus-within:ring-2 focus-within:ring-orange-100 transition-all">
               <Phone className="w-5 h-5 text-slate-400 shrink-0" />
               <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Phone Number</p>
                  <input 
                    type="text"
                    value={vendor.phone || ""}
                    onChange={e => updateVendor("phone", e.target.value)}
                    className="w-full bg-transparent font-bold text-slate-900 focus:outline-none" 
                  />
               </div>
            </div>
         </div>
      </div>

      {/* Assignment Logic */}
      <div className="space-y-4">
         <h2 className="text-lg font-black text-slate-800 ml-2 mt-4">Assigned Locations</h2>
         <div className="grid grid-cols-1 gap-3">
            {sites.map(site => (
              <div 
                key={site.id}
                onClick={() => toggleSite(site.id)}
                className={`p-5 rounded-[24px] border-2 flex items-center justify-between cursor-pointer transition-all duration-300 ${
                  vendor.assigned_site_ids.includes(site.id)
                  ? "border-orange-500 bg-orange-50 shadow-lg shadow-orange-100"
                  : "border-slate-100 bg-white hover:border-slate-200"
                }`}
              >
                 <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-full transition-colors ${
                      vendor.assigned_site_ids.includes(site.id) ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400"
                    }`}>
                       <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                       <p className="font-black text-slate-900">{site.name}</p>
                       <p className="text-slate-400 text-[10px] font-bold font-mono">{site.id}</p>
                    </div>
                 </div>
                 {vendor.assigned_site_ids.includes(site.id) && (
                    <CheckCircle2 className="w-6 h-6 text-orange-500 stroke-[3px]" />
                 )}
              </div>
            ))}
         </div>
      </div>

      {/* Security Actions */}
      <div className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors group">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform"><KeyRound className="w-6 h-6" /></div>
            <div>
               <h3 className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">Credential Reset</h3>
               <p className="text-slate-500 text-xs font-medium mt-0.5">Regenerate vendor login credentials</p>
            </div>
         </div>
      </div>

      {/* Danger Zone */}
      {vendor.status === 'ACTIVE' && (
        <div className="border border-red-100 bg-red-50 rounded-[32px] p-8 mt-12">
           <h3 className="font-black text-red-700 text-sm mb-4 uppercase tracking-[0.2em] text-center">Danger Control</h3>
           <p className="text-red-900/40 text-xs font-bold text-center mb-8 leading-relaxed">
              Terminating access will force-logout this vendor from all devices and prevent further activity.
           </p>
           <button 
             onClick={() => setShowRevokeModal(true)} 
             className="w-full bg-red-600 hover:bg-red-700 text-white py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-red-100 active:scale-95 flex items-center justify-center gap-2"
           >
              <Trash2 className="w-4 h-4" /> Final Revocation
           </button>
        </div>
      )}
    </div>
  );
}
