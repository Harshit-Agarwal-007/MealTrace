"use client";
import { ArrowLeft, Bell, Key, Loader2, Save, User, Mail, Phone } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { api } from "@/lib/apiClient";
import type { ResidentProfile } from "@/lib/types";

const inputClass =
  "w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 [color-scheme:light]";

// Persist push notification preference in localStorage
const PUSH_PREF_KEY = "pushNotificationsEnabled";

export default function SettingsPage() {
  const [toast, setToast] = useState(false);
  const [profile, setProfile] = useState<ResidentProfile | null>(null);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pushSaving, setPushSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    api
      .get<ResidentProfile>("/resident/profile")
      .then((data) => {
        setProfile(data);
        setFormData({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
        });
        const fromServer = data.push_notifications_enabled;
        if (typeof fromServer === "boolean") {
          setPushEnabled(fromServer);
          localStorage.setItem(PUSH_PREF_KEY, String(fromServer));
        } else {
          const stored = localStorage.getItem(PUSH_PREF_KEY);
          if (stored !== null) setPushEnabled(stored === "true");
        }
      })
      .catch(console.error);
  }, []);

  const togglePush = async () => {
    const next = !pushEnabled;
    setPushSaving(true);
    try {
      await api.patch("/resident/profile", { push_notifications_enabled: next });
      setPushEnabled(next);
      localStorage.setItem(PUSH_PREF_KEY, String(next));
    } catch (e) {
      console.error(e);
    } finally {
      setPushSaving(false);
    }
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    try {
      await api.patch("/resident/profile", formData);
      setToast(true);
      setTimeout(() => setToast(false), 3000);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="scheme-light p-6 pt-8 animate-in fade-in duration-500 pb-24 relative text-slate-900">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-in slide-in-from-top-10 fade-in zoom-in duration-300">
           ✅ <span className="font-bold text-sm">Profile updated</span>
        </div>
      )}

      <Link href="/resident/profile" className="inline-flex items-center text-indigo-600 font-bold mb-6 hover:text-indigo-700 transition-colors">
         <ArrowLeft className="w-5 h-5 mr-2" /> Back to Profile
      </Link>
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Profile & Settings</h1>
        <button onClick={handleSave} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 active:scale-95 transition-transform shadow-md shadow-indigo-500/30">
          <Save className="w-4 h-4" /> Save
        </button>
      </div>
      
      <form onSubmit={handleSave} className="space-y-6" style={{ colorScheme: "light" }}>
         <div className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm space-y-4 relative">
            <h2 className="text-sm font-bold text-slate-900 mb-2">Personal Details</h2>
            
            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Full Name</label>
               <div className="relative">
                 <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                 <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className={inputClass} />
               </div>
            </div>

            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Email Address</label>
               <div className="relative">
                 <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input type="email" value={formData.email} disabled className={`${inputClass} cursor-not-allowed bg-slate-100 opacity-90`} />
               </div>
            </div>

            <div>
               <label className="text-xs text-slate-500 font-bold tracking-wider uppercase mb-1.5 block">Phone Number</label>
               <div className="relative">
                 <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className={inputClass} />
               </div>
            </div>
         </div>

         <div className="space-y-4">
            <h2 className="text-sm font-bold text-gray-900 mb-2 ml-1">App Settings</h2>
            <div className="bg-white p-5 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm">
               <div className="flex items-center gap-4">
                  <Bell className="text-gray-400 w-5 h-5" />
                  <div>
                    <span className="font-semibold text-gray-700">Push Notifications</span>
                    <p className="text-xs text-gray-400 mt-0.5">{pushEnabled ? "Enabled" : "Disabled"}</p>
                  </div>
               </div>
               <button
                 type="button"
                 onClick={() => void togglePush()}
                 disabled={pushSaving}
                 className={`relative h-6 w-12 cursor-pointer rounded-full transition-colors duration-300 disabled:opacity-60 ${
                   pushEnabled ? "bg-indigo-600" : "bg-gray-300"
                 }`}
               >
                  {pushSaving ? (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                    </span>
                  ) : (
                    <div
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300 ${
                        pushEnabled ? "right-0.5" : "left-0.5"
                      }`}
                    />
                  )}
               </button>
            </div>
            
            <Link href="/forgot-password" className="bg-white p-5 rounded-2xl border border-gray-100 flex justify-between items-center shadow-sm cursor-pointer hover:bg-gray-50 transition-colors block w-full">
               <div className="flex items-center gap-4">
                  <Key className="text-gray-400 w-5 h-5" />
                  <span className="font-semibold text-gray-700">Change Password</span>
               </div>
            </Link>
         </div>
      </form>
    </div>
  )
}
