"use client";

/**
 * Register Page — MealTrace
 *
 * Flow (wiring doc §2.2):
 *  1. Collect profile fields: name, email, password, phone, room_number, site_id, dietary_preference
 *  2. POST /auth/register → { access_token, refresh_token, role, user_id }
 *     (backend creates Firebase Auth account + Firestore resident profile internally)
 *  3. login() → redirect to /resident
 *
 * Note: The backend creates the Firebase user, so we do NOT call Firebase client-side
 * on registration — the backend handles it via the Admin SDK.
 * Dietary preference and room/site are required fields per RegisterRequest schema.
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/apiClient";
import type { TokenResponse, PlanInfo } from "@/lib/types";
import { Utensils, Mail, Lock, UserPlus, User, Phone, BedDouble, Leaf, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const { login } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    room_number: "",
    site_id: "",
    dietary_preference: "VEG",
  });
  const [sites, setSites] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load available sites for the dropdown
  useEffect(() => {
    // Sites endpoint requires auth; for registration we use a simple static list
    // or an open endpoint if the backend exposes one. For now we allow manual entry.
    // This can be replaced with a public /sites/public endpoint if added later.
    setSites([]); // empty → shows text input fallback
  }, []);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // POST /auth/register — backend creates Firebase account + Firestore profile
      const data = await api.post<TokenResponse>("/auth/register", form);

      // Immediately log in — backend returns tokens on successful registration
      login(data.access_token, data.refresh_token, data.role, data.user_id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create account.";
      if (msg.includes("email-already-in-use") || msg.includes("already registered")) {
        setError("An account with this email already exists.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "pl-10 block w-full rounded-xl border border-gray-200 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 py-2.5 bg-gray-50/50 text-gray-900 sm:text-sm transition-shadow";

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div className="flex flex-col items-center space-y-3">
          <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-200">
            <Utensils className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Account</h1>
          <p className="text-gray-500 text-sm">Join MealTrace Digital</p>
        </div>

        {/* Form Card */}
        <div className="bg-white px-6 py-8 shadow-xl shadow-gray-200/50 rounded-2xl border border-gray-100">
          <form onSubmit={handleRegister} className="space-y-4">

            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input id="reg-name" type="text" required value={form.name} onChange={set("name")}
                  className={inputClass} placeholder="John Doe" />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input id="reg-email" type="email" required autoComplete="email" value={form.email} onChange={set("email")}
                  className={inputClass} placeholder="name@example.com" />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input id="reg-password" type="password" required minLength={6} autoComplete="new-password"
                  value={form.password} onChange={set("password")}
                  className={inputClass} placeholder="Min 6 characters" />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block">Phone (optional)</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input id="reg-phone" type="tel" value={form.phone} onChange={set("phone")}
                  className={inputClass} placeholder="+91 99999 00000" />
              </div>
            </div>

            {/* Room Number */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block">Room Number</label>
              <div className="relative">
                <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input id="reg-room" type="text" required value={form.room_number} onChange={set("room_number")}
                  className={inputClass} placeholder="e.g. 204 B" />
              </div>
            </div>

            {/* Site ID */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block">Site / PG ID</label>
              <div className="relative">
                <BedDouble className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input id="reg-site" type="text" required value={form.site_id} onChange={set("site_id")}
                  className={inputClass} placeholder="Ask your PG manager for your Site ID" />
              </div>
            </div>

            {/* Dietary Preference */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block flex items-center gap-1.5">
                <Leaf className="w-4 h-4 text-emerald-500" /> Dietary Preference
              </label>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                {(["VEG", "NON-VEG"] as const).map((opt) => (
                  <button key={opt} type="button"
                    onClick={() => setForm((f) => ({ ...f, dietary_preference: opt }))}
                    className={`py-2 rounded-lg text-sm font-bold transition-all ${
                      form.dietary_preference === opt
                        ? opt === "VEG"
                          ? "bg-emerald-500 text-white shadow-sm"
                          : "bg-red-500 text-white shadow-sm"
                        : "text-gray-500 hover:bg-white"
                    }`}
                  >
                    {opt === "VEG" ? "🥦 Vegetarian" : "🍗 Non-Veg"}
                  </button>
                ))}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 text-red-600 text-sm font-medium bg-red-50 p-3 rounded-xl border border-red-100">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button id="reg-submit" type="submit" disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-md shadow-indigo-600/30 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-all active:scale-[0.98] mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create Account
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-600 mt-6 !mb-0">
              Already have an account?{" "}
              <Link href="/login" className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
