"use client";

/**
 * Login Page — MealTrace
 *
 * Auth flow (wiring doc §2.1):
 *  1. User enters email/password → Firebase Auth signInWithEmailAndPassword
 *  2. getIdToken() from Firebase
 *  3. POST /auth/login  { firebase_id_token }  → { access_token, refresh_token, role, user_id }
 *  4. Persist tokens → AuthContext.login() → role-based redirect
 */

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { api } from "@/lib/apiClient";
import type { TokenResponse } from "@/lib/types";
import { Utensils, Mail, Lock, LogIn, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Step 1 — Firebase sign-in
      const credential = await signInWithEmailAndPassword(auth, email, password);

      // Step 2 — Get Firebase ID token
      const idToken = await credential.user.getIdToken();

      // Step 3 — Exchange with our backend (wiring doc §2.1 step 3)
      const data = await api.post<TokenResponse>("/auth/login", {
        firebase_id_token: idToken,
      });

      // Step 4 — Persist and redirect (role comes from server)
      login(data.access_token, data.refresh_token, data.role, data.user_id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in.";
      // Friendly Firebase error messages
      if (msg.includes("invalid-credential") || msg.includes("wrong-password")) {
        setError("Invalid email or password. Please try again.");
      } else if (msg.includes("user-not-found")) {
        setError("No account found with this email.");
      } else if (msg.includes("too-many-requests")) {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm space-y-6">

        {/* Header */}
        <div className="flex flex-col items-center space-y-3">
          <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-200">
            <Utensils className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome to MealTrace</h1>
          <p className="text-gray-500 text-sm">Sign in to your account</p>
        </div>

        {/* Form Card */}
        <div className="bg-white px-6 py-8 shadow-xl shadow-gray-200/50 rounded-2xl border border-gray-100">
          <form onSubmit={handleLogin} className="space-y-5">

            {/* Email */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full rounded-xl border border-gray-200 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 py-2.5 bg-gray-50/50 text-gray-900 sm:text-sm transition-shadow"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 block">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="login-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 block w-full rounded-xl border border-gray-200 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 py-2.5 bg-gray-50/50 text-gray-900 sm:text-sm transition-shadow"
                  placeholder="••••••••"
                />
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
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-md shadow-indigo-600/30 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-all active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2" />
                  Sign In
                </>
              )}
            </button>

            <p className="text-center text-sm text-gray-600 mt-6 !mb-0">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors"
              >
                Sign up
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
