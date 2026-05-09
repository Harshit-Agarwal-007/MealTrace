"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Save, Store, Mail, MapPin, Phone, Lock, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";
import type { SiteInfo } from "@/lib/types";

export default function AdminVendorCreate() {
  const router = useRouter();
  const [sites, setSites] = useState<SiteInfo[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    assigned_site_ids: [] as string[]
  });
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ sites: SiteInfo[] }>("/sites")
      .then(res => setSites(res.sites || []))
      .catch(() => {})
      .finally(() => setLoadingSites(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) return;
    
    setSaving(true);
    setError(null);
    try {
      await api.post("/admin/vendors", form);
      router.push("/admin/vendors");
    } catch (err: any) {
      setError(err.message || "Failed to create vendor account");
      setSaving(false);
    }
  };

  const toggleSite = (siteId: string) => {
    const current = [...form.assigned_site_ids];
    if (current.includes(siteId)) {
      setForm({ ...form, assigned_site_ids: current.filter(id => id !== siteId) });
    } else {
      setForm({ ...form, assigned_site_ids: [...current, siteId] });
    }
  };

  return (
    <div className="p-6 pt-8 pb-32 animate-in slide-in-from-right duration-500 space-y-6 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
         <Link href="/admin/vendors" className="bg-white p-3 rounded-full shadow-sm border border-slate-100 hover:bg-slate-50 transition-all">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
         </Link>
         <button 
           onClick={handleSave}
           disabled={saving || !form.name || !form.email || !form.password}
           className="bg-orange-600 text-white px-6 py-2.5 rounded-full text-xs font-black flex items-center gap-2 active:scale-95 transition-all shadow-xl shadow-orange-100 disabled:opacity-50"
         >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Provisioning..." : "Provision Vendor"}
         </button>
      </div>

      <h1 className="text-2xl font-black text-slate-900 mb-2">Setup Vendor Terminal</h1>
      <p className="text-slate-400 text-xs font-bold uppercase tracking-widest ml-1">Create a new service access point</p>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 flex items-center gap-3 animate-shake">
          <AlertCircle className="w-5 h-5" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}
      
      <form onSubmit={handleSave} className="space-y-6">
         <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm space-y-5">
            <div className="space-y-1.5">
               <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-1 block pl-1">Vendor Device Name</label>
               <div className="relative">
                 <Store className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                 <input 
                   type="text" 
                   required
                   value={form.name}
                   onChange={e => setForm({ ...form, name: e.target.value })}
                   placeholder="e.g. Cafeteria Terminal 1" 
                   className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-100 focus:outline-none font-bold text-slate-900 transition-all" 
                 />
               </div>
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-1 block pl-1">Login Email</label>
               <div className="relative">
                 <Mail className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                 <input 
                   type="email" 
                   required
                   value={form.email}
                   onChange={e => setForm({ ...form, email: e.target.value })}
                   placeholder="vendor@mealtrace.com" 
                   className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-100 focus:outline-none font-bold text-slate-900 transition-all" 
                 />
               </div>
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-1 block pl-1">Temporary Password</label>
               <div className="relative">
                 <Lock className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                 <input 
                   type="password" 
                   required
                   value={form.password}
                   onChange={e => setForm({ ...form, password: e.target.value })}
                   placeholder="Minimum 6 characters" 
                   className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-100 focus:outline-none font-bold text-slate-900 transition-all" 
                 />
               </div>
            </div>

            <div className="space-y-1.5">
               <label className="text-[10px] text-slate-400 font-black tracking-widest uppercase mb-1 block pl-1">Phone (Optional)</label>
               <div className="relative">
                 <Phone className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                 <input 
                   type="text" 
                   value={form.phone}
                   onChange={e => setForm({ ...form, phone: e.target.value })}
                   placeholder="+91 99999 99999" 
                   className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-orange-100 focus:outline-none font-bold text-slate-900 transition-all" 
                 />
               </div>
            </div>
         </div>

         <div className="space-y-4">
            <h2 className="text-lg font-black text-slate-800 ml-2">Initial Site Assignment</h2>
            <div className="grid grid-cols-1 gap-2">
               {loadingSites ? (
                  <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
               ) : sites.length === 0 ? (
                  <p className="text-slate-400 text-xs font-bold pl-2">No sites available to assign.</p>
               ) : (
                  sites.map(site => (
                    <div 
                      key={site.id} 
                      onClick={() => toggleSite(site.id)}
                      className={`p-4 rounded-2xl border-2 flex items-center justify-between cursor-pointer transition-all ${
                        form.assigned_site_ids.includes(site.id)
                        ? "border-orange-500 bg-orange-50"
                        : "border-slate-100 bg-white hover:border-slate-200"
                      }`}
                    >
                       <div className="flex items-center gap-3">
                          <MapPin className={`w-4 h-4 ${form.assigned_site_ids.includes(site.id) ? "text-orange-500" : "text-slate-400"}`} />
                          <span className="text-sm font-bold text-slate-900">{site.name}</span>
                       </div>
                       {form.assigned_site_ids.includes(site.id) && (
                          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                       )}
                    </div>
                  ))
               )}
            </div>
         </div>
      </form>
    </div>
  );
}
