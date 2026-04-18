"use client";
import { ArrowLeft, Save, User, Mail, Phone, Home, Loader2, MapPin, Key } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/apiClient";

export default function AdminResidentCreate() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sites, setSites] = useState<{id: string, name: string}[]>([]);
  
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    room_number: "",
    site_id: "",
    password: ""
  });

  useEffect(() => {
    api.get<{sites: any[]}>("/sites")
       .then(res => {
         setSites(res.sites || []);
         if (res.sites?.length > 0) {
           setForm(f => ({ ...f, site_id: res.sites[0].id }));
         }
       })
       .catch(() => {});
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/admin/residents", form);
      router.push("/admin/residents");
    } catch (err: any) {
      alert(err.message || "Failed to create resident");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 pt-8 pb-24 animate-in slide-in-from-right duration-500 space-y-6 max-w-lg mx-auto">
      <div className="flex justify-between items-center mb-4">
         <Link href="/admin/residents" className="inline-flex items-center text-blue-600 font-bold hover:text-blue-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Residents
         </Link>
         <button onClick={handleCreate} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-md shadow-blue-500/20 disabled:opacity-70">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Create User
         </button>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Add New Resident</h1>
      
      <form className="space-y-4" onSubmit={handleCreate}>
         <div className="bg-white p-5 rounded-[24px] border border-slate-200 shadow-sm space-y-4">
            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Full Name</label>
               <div className="relative">
                 <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="John Doe" className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none" />
               </div>
            </div>

            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Email Address (Login ID)</label>
               <div className="relative">
                 <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required placeholder="john@example.com" className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none" />
               </div>
            </div>

            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Default Password</label>
               <div className="relative">
                 <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <input type="text" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required placeholder="Set temporary password" minLength={6} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none" />
               </div>
               <p className="text-[10px] text-slate-400 mt-1">Must be at least 6 characters.</p>
            </div>

            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Phone Number</label>
               <div className="relative">
                 <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <input type="tel" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} required placeholder="+91 9999999999" className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none" />
               </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div>
                 <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Assigned Site</label>
                 <div className="relative">
                   <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                   <select required value={form.site_id} onChange={e => setForm({...form, site_id: e.target.value})} className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none appearance-none font-medium text-sm">
                     {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                     {sites.length === 0 && <option value="">Loading sites...</option>}
                   </select>
                 </div>
               </div>

               <div>
                 <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Room No</label>
                 <div className="relative">
                   <Home className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                   <input type="text" value={form.room_number} onChange={e => setForm({...form, room_number: e.target.value})} required placeholder="404 B" className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none" />
                 </div>
               </div>
            </div>
         </div>
         <button type="submit" className="hidden"></button>
      </form>
    </div>
  )
}
