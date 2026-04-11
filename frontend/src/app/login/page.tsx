"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { Utensils, Mail, Lock, LogIn } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleSelection, setRoleSelection] = useState("RESIDENT");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    try {
      // 1. Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // const idToken = await userCredential.user.getIdToken();
      
      // 2. Call backend POST /auth/login with the token (mocked here for the UI demo)
      // For Demo purposes, we use the selected role in the UI dropdown. 
      // In production, the backend returns the actual role based on the user's DB record.
      const mockBackendToken = "eyMockToken123456789";
      
      // 3. Set Context
      login(mockBackendToken, roleSelection);
      
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please check your credentials.");
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
            
            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 block">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 block w-full rounded-xl border-gray-200 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 py-2.5 bg-gray-50/50 text-gray-900 sm:text-sm transition-shadow"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 block">Password</label>
                <div className="text-sm">
                  <Link href="/forgot-password" className="font-semibold text-indigo-600 hover:text-indigo-500">
                    Forgot your password?
                  </Link>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 block w-full rounded-xl border-gray-200 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 py-2.5 bg-gray-50/50 text-gray-900 sm:text-sm transition-shadow"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* Role Demo Select (Temporary for UI demonstration) */}
            <div className="space-y-1">
               <label className="text-sm font-medium text-gray-700 block">Login As (Demo)</label>
               <select 
                 value={roleSelection} 
                 onChange={e => setRoleSelection(e.target.value)}
                 className="block w-full rounded-xl border-gray-200 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 py-2.5 px-3 bg-gray-50/50 text-gray-900 sm:text-sm transition-shadow"
               >
                 <option value="RESIDENT">Resident</option>
                 <option value="VENDOR">Vendor</option>
                 <option value="SUPER_ADMIN">System Admin</option>
               </select>
            </div>

            {error && (
              <div className="text-red-500 text-sm font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
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
              Don't have an account?{" "}
              <a href="/register" className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
                Sign up
              </a>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
