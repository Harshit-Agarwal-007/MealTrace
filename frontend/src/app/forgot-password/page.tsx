"use client";
import { ArrowLeft, Mail, Info, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/apiClient";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError("");
    
    try {
      await api.post("/auth/forgot-password", { email });
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send reset link.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm space-y-6">
        <Link href="/login" className="inline-flex items-center text-indigo-600 font-bold hover:text-indigo-700 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Login
        </Link>
        <div className="flex flex-col space-y-2">
            <h1 className="text-2xl font-bold text-gray-900">Reset Password</h1>
            <p className="text-gray-500 text-sm">Enter your account email to receive a password recovery link.</p>
        </div>

        {sent ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 text-center animate-in zoom-in duration-300">
             <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-emerald-600" />
             </div>
             <h3 className="text-lg font-bold text-emerald-900 mb-2">Check your email</h3>
             <p className="text-emerald-700 text-sm">We've sent password reset instructions to <b>{email}</b>.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white px-6 py-8 shadow-xl shadow-gray-200/50 rounded-2xl border border-gray-100 space-y-6">
             <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700 block">Email Address</label>
                <div className="relative">
                  <Mail className="absolute inset-y-0 left-0 pl-3 top-2.5 flex items-center pointer-events-none w-5 h-5 text-gray-400" />
                  <input
                    type="email" required value={email} onChange={e => setEmail(e.target.value)}
                    className="pl-10 block w-full rounded-xl border-gray-200 shadow-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 py-2.5 bg-gray-50/50 text-gray-900 sm:text-sm transition-shadow border"
                    placeholder="name@example.com"
                  />
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2.5 text-red-600 text-sm font-medium bg-red-50 p-3 rounded-xl border border-red-100">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-xs flex gap-2 items-start border border-blue-100">
                 <Info className="w-4 h-4 shrink-0 mt-0.5" />
                 <p>If your account was provisioned by an Administrator, you may need to ask them directly to reset it.</p>
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full flex justify-center items-center py-2.5 px-4 rounded-xl shadow-md shadow-indigo-600/30 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Reset Link"}
              </button>
          </form>
        )}
      </div>
    </div>
  )
}
