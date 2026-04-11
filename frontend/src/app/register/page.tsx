"use client";

/**
 * Register Page — MealTrace
 *
 * Flow (wiring doc §2.2):
 *  1. Collect profile fields
 *  2. POST /auth/register → { access_token, ... }
 *  3. login() → redirect
 */

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/apiClient";
import type { TokenResponse } from "@/lib/types";
import { Utensils, Mail, Lock, UserPlus, User, Phone, BedDouble, Leaf, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "",
    room_number: "", site_id: "", dietary_preference: "VEG",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await api.post<TokenResponse>("/auth/register", form);
      login(data.access_token, data.refresh_token, data.role, data.user_id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create account.";
      setError(msg.includes("email-already-in-use") ? "Account exists with this email." : msg);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "pl-10 block w-full rounded-xl border border-gray-200 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 py-2.5 bg-gray-50/50 text-gray-900 sm:text-sm transition-shadow";

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm space-y-6">

        <div className="flex flex-col items-center space-y-3">
          <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-200">
            <Utensils className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
        </div>

        <div className="bg-white px-6 py-8 shadow-xl shadow-gray-200/50 rounded-2xl border border-gray-100">
          <form onSubmit={handleRegister} className="space-y-4">
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="text" required value={form.name} onChange={set("name")} className={inputClass} placeholder="John Doe" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="email" required value={form.email} onChange={set("email")} className={inputClass} placeholder="name@example.com" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="password" required minLength={6} value={form.password} onChange={set("password")} className={inputClass} placeholder="Min 6 chars" />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block">Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input type="tel" value={form.phone} onChange={set("phone")} className={inputClass} placeholder="+91 99999 00000" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 block">Room</label>
                <div className="relative">
                  <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type="text" required value={form.room_number} onChange={set("room_number")} className={inputClass} placeholder="204" />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 block">Site ID</label>
                <div className="relative">
                  <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type="text" required value={form.site_id} onChange={set("site_id")} className={inputClass} placeholder="s_main" />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block flex items-center gap-1.5">
                <Leaf className="w-4 h-4 text-emerald-500" /> Dietary
              </label>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                {(["VEG", "NON-VEG"] as const).map((opt) => (
                  <button key={opt} type="button"
                    onClick={() => setForm(f => ({ ...f, dietary_preference: opt }))}
                    className={`py-2 rounded-lg text-sm font-bold transition-all ${
                      form.dietary_preference === opt
                        ? (opt === "VEG" ? "bg-emerald-500 text-white" : "bg-red-500 text-white")
                        : "text-gray-500 hover:bg-white"
                    }`}
                  >
                    {opt === "VEG" ? "🥦 Veg" : "🍗 Non-Veg"}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 text-red-600 text-sm font-medium bg-red-50 p-3 rounded-xl border border-red-100">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-md text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 mt-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-t-white rounded-full animate-spin" /> : <><UserPlus className="w-4 h-4 mr-2" />Create Account</>}
            </button>

            <p className="text-center text-sm text-gray-600 mt-6 !mb-0">
              Already have an account? <Link href="/login" className="font-bold text-indigo-600">Sign in</Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
