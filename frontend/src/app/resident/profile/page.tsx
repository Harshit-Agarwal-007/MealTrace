"use client";

/**
 * Resident Profile — wiring doc §3.4
 *
 * GET /resident/profile — Load name, email, room, dietary, site
 * PATCH /resident/profile — Save updated dietary_preference (and optionally name, phone)
 *   Only fields allowed by UpdateSelfProfileRequest: name, phone, room_number
 */

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/apiClient";
import type { ResidentProfile } from "@/lib/types";
import { User, Settings, LogOut, ShieldAlert, Leaf, Check, Loader2, AlertCircle, X, Phone, Mail } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim();
const SUPPORT_EMAIL =
  process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || "support@mealtrace.in";

export default function ResidentProfilePage() {
  const { logout } = useAuth();
  const [profile, setProfile] = useState<ResidentProfile | null>(null);
  const [diet, setDiet] = useState<"VEG" | "NON-VEG">("VEG");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    api.get<ResidentProfile>("/resident/profile")
      .then((p) => {
        setProfile(p);
        setDiet((p.dietary_preference?.toUpperCase() as "VEG" | "NON-VEG") ?? "VEG");
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  const saveDiet = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      // PATCH /resident/profile — UpdateSelfProfileRequest
      const updated = await api.patch<ResidentProfile>("/resident/profile", {
        dietary_preference: diet,
      });
      setProfile(updated);
      setSaveMsg("Dietary preference saved!");
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-60">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-60 gap-3 text-red-500">
        <AlertCircle className="w-8 h-8" />
        <p className="text-sm font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Help & Support Modal */}
      {showHelp && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 pb-safe"
          onClick={() => setShowHelp(false)}
        >
          <div
            className="relative z-[101] w-full max-h-[85vh] overflow-y-auto rounded-t-[32px] bg-white p-8 pb-10 animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-900">Help & Support</h2>
              <button onClick={() => setShowHelp(false)} className="p-2 bg-gray-100 rounded-full">
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>
            <p className="text-gray-500 text-sm mb-6 font-medium">
              Having trouble? Reach out to the MealTrace support team.
            </p>
            <div className="space-y-4">
              {SUPPORT_PHONE ? (
                <a
                  href={`tel:${SUPPORT_PHONE.replace(/\s/g, "")}`}
                  className="flex items-center gap-4 bg-indigo-50 p-4 rounded-2xl border border-indigo-100 hover:bg-indigo-100 transition-colors"
                >
                  <div className="bg-indigo-600 p-2.5 rounded-xl">
                    <Phone className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">Call Support</p>
                    <p className="text-indigo-600 text-sm font-semibold">{SUPPORT_PHONE}</p>
                  </div>
                </a>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  Set <code className="text-xs">NEXT_PUBLIC_SUPPORT_PHONE</code> to show a call button. Email support
                  below always works.
                </div>
              )}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors"
              >
                <div className="bg-slate-700 p-2.5 rounded-xl">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Email Support</p>
                  <p className="text-slate-600 text-sm font-semibold">{SUPPORT_EMAIL}</p>
                </div>
              </a>
            </div>
            <p className="text-center text-xs text-gray-400 mt-6">Support hours: Mon–Sat, 9 AM – 6 PM</p>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Profile</h1>
        <p className="mt-0.5 text-sm text-slate-600">Your account and preferences</p>
      </div>

      {/* Avatar + Info */}
      <div className="bg-white rounded-[32px] p-6 shadow-xl shadow-gray-200/50 border border-gray-100 flex flex-col items-center justify-center space-y-4">
        <div className="w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center shadow-inner border border-indigo-50">
          <User className="w-10 h-10 text-indigo-400" />
        </div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-900">{profile?.name ?? "—"}</h2>
          <p className="text-gray-500 text-sm mt-0.5">{profile?.email ?? "—"}</p>
        </div>
        <span className="bg-indigo-50 text-indigo-600 font-bold px-4 py-1.5 rounded-full text-xs border border-indigo-100">
          Room {profile?.room_number ?? "—"} • Site {profile?.site_id ?? "—"}
        </span>
      </div>

      {/* Settings Links */}
      <div className="space-y-3">
        <Link
          href="/resident/settings"
          className="w-full bg-white p-4 rounded-2xl flex items-center justify-between text-gray-700 shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <Settings className="text-gray-400 w-5 h-5" />
            <span className="font-semibold text-sm">Account Settings</span>
          </div>
        </Link>
        <button
          onClick={() => setShowHelp(true)}
          className="w-full bg-white p-4 rounded-2xl flex items-center justify-between text-gray-700 shadow-sm border border-gray-100 hover:bg-gray-50 active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-gray-400 w-5 h-5" />
            <span className="font-semibold text-sm">Help & Support</span>
          </div>
        </button>
      </div>

      {/* Dietary preference */}
      <div className="mt-4 space-y-3">
        <h3 className="font-bold text-gray-900 ml-1 mb-4 flex items-center gap-2">
          <Leaf className="w-5 h-5 text-emerald-500" /> Dietary Preference
        </h3>

        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm grid grid-cols-2 gap-2">
          {(["VEG", "NON-VEG"] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setDiet(opt)}
              className={`py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                diet === opt
                  ? opt === "VEG"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm"
                    : "bg-red-50 text-red-700 border border-red-200 shadow-sm"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {diet === opt && <Check className="w-4 h-4" />}
              {opt === "VEG" ? "Vegetarian" : "Non-Veg"}
            </button>
          ))}
        </div>

        <button
          onClick={saveDiet}
          disabled={saving || diet === (profile?.dietary_preference?.toUpperCase())}
          className="w-full bg-indigo-600 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-[0.98] shadow-md shadow-indigo-600/20"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          {saving ? "Saving..." : "Save Preference"}
        </button>

        {saveMsg && (
          <p className={`text-center text-sm font-semibold ${saveMsg.includes("Failed") || saveMsg.includes("Error") ? "text-red-500" : "text-emerald-600"}`}>
            {saveMsg}
          </p>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={logout}
        className="w-full bg-red-50 p-4 rounded-2xl flex items-center gap-3 text-red-600 shadow-sm border border-red-100 hover:bg-red-100 active:scale-[0.98] transition-all mt-4"
      >
        <LogOut className="text-red-500 w-5 h-5" />
        <span className="font-bold text-sm">Log Out</span>
      </button>
    </div>
  );
}
