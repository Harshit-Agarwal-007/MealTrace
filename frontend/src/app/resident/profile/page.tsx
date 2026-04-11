"use client";

/**
 * Resident Profile
 *
 * GET /resident/profile
 * PATCH /resident/profile (for dietary pref, etc.)
 */

import { useState, useEffect } from "react";
import { User, Mail, Phone, MapPin, Loader2, Save, Command } from "lucide-react";
import { api } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";

interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  room_number?: string;
  dietary_preference: string;
}

export default function ResidentProfilePage() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    api.get<Profile>("/resident/profile")
       .then(setProfile)
       .catch(() => {})
       .finally(() => setLoading(false));
  }, []);

  const saveDietary = async (pref: string) => {
    if (!profile) return;
    setSaving(true);
    setMsg("");
    try {
      await api.patch("/resident/profile", { dietary_preference: pref });
      setProfile({ ...profile, dietary_preference: pref });
      setMsg("Saved!");
      setTimeout(() => setMsg(""), 3000);
    } catch {
      setMsg("Failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex h-[80vh] items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin"/></div>;
  }

  return (
    <div className="p-6 pt-8 pb-24 animate-in fade-in duration-500 space-y-6">
      <h1 className="text-2xl font-black text-gray-900">Profile</h1>

      <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-xl shadow-gray-200/50 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-70"></div>
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="w-20 h-20 bg-indigo-100 rounded-[24px] flex items-center justify-center shadow-inner">
             <span className="text-3xl font-black text-indigo-600">{profile?.name.charAt(0) || "U"}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 leading-tight">{profile?.name}</h2>
            <p className="text-sm font-medium text-indigo-600 mt-1">{profile?.id}</p>
          </div>
        </div>

        <div className="mt-8 space-y-5 relative z-10">
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-700">{profile?.email}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Phone className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-700">{profile?.phone || "Not provided"}</span>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <MapPin className="w-5 h-5 text-gray-400" />
            <span className="font-medium text-gray-700">Room {profile?.room_number || "XX"}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm space-y-4">
        <h3 className="font-bold text-gray-900">Dietary Preference</h3>
        <div className="grid grid-cols-2 gap-3">
          {(["VEG", "NON-VEG"] as const).map(pref => (
            <button
              key={pref}
              onClick={() => saveDietary(pref)}
              disabled={saving}
              className={`p-4 rounded-2xl flex flex-col items-center gap-2 font-bold transition-all border ${
                profile?.dietary_preference === pref 
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-md shadow-emerald-500/10" 
                  : "border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100"
              }`}
            >
              {pref === "VEG" ? "🥦 Veg" : "🍗 Non-Veg"}
            </button>
          ))}
        </div>
        {msg && <p className="text-sm text-emerald-600 font-bold text-center animate-in slide-in-from-bottom-2">{msg}</p>}
      </div>

      <button 
        onClick={logout}
        className="w-full bg-red-50 text-red-600 font-bold py-4 rounded-2xl hover:bg-red-100 transition-colors"
      >
        Sign Out
      </button>

      <p className="text-center text-xs text-gray-400 font-medium">MealTrace PWA v2.0</p>
    </div>
  );
}
