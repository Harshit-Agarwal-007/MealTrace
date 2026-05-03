"use client";

/**
 * Guest Pass — purchase via Razorpay, then show QR until USED or expired.
 * Active UNUSED passes are restored from GET /resident/guest-passes on load.
 */

import { useEffect, useState, useCallback } from "react";
import { QrCode, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import Image from "next/image";
import type { GuestPassInfo, ResidentCatalogResponse, ResidentProfile } from "@/lib/types";

declare global {
  interface Window {
    Razorpay: any;
  }
}

interface ActiveGuestPassView {
  id: string;
  qr_base64: string;
  status: "UNUSED" | "USED";
  expiry_at: string;
}

function pickActiveGuestPass(list: GuestPassInfo[]): GuestPassInfo | null {
  const now = Date.now();
  for (const p of list) {
    if (p.status !== "UNUSED" || !p.qr_base64) continue;
    const ex = p.expiry_at ? new Date(p.expiry_at).getTime() : 0;
    if (ex > now) return p;
  }
  return null;
}

export default function GuestPassPage() {
  const [loading, setLoading] = useState(false);
  const [siteLoading, setSiteLoading] = useState(true);
  const [passesHydrating, setPassesHydrating] = useState(true);
  const [passData, setPassData] = useState<ActiveGuestPassView | null>(null);
  const [error, setError] = useState("");
  const [siteId, setSiteId] = useState("");
  const [guestPassEnabled, setGuestPassEnabled] = useState(true);
  const [priceInr, setPriceInr] = useState(100);
  const [profile, setProfile] = useState<ResidentProfile | null>(null);

  const hydrateActivePass = useCallback(async () => {
    setPassesHydrating(true);
    try {
      const list = await api.get<GuestPassInfo[]>("/resident/guest-passes");
      const active = pickActiveGuestPass(list);
      if (active?.qr_base64 && active.expiry_at) {
        setPassData({
          id: active.id,
          qr_base64: active.qr_base64,
          status: "UNUSED",
          expiry_at: active.expiry_at,
        });
      } else {
        setPassData(null);
      }
    } catch {
      /* non-fatal */
    } finally {
      setPassesHydrating(false);
    }
  }, []);

  useEffect(() => {
    setSiteLoading(true);
    setError("");
    Promise.all([
      api.get<ResidentProfile>("/resident/profile"),
      api.get<ResidentCatalogResponse>("/resident/catalog"),
    ])
      .then(([profileData, catalog]) => {
        setProfile(profileData);
        setSiteId(profileData.site_id ?? "");
        setGuestPassEnabled(catalog.guest_pass?.enabled ?? true);
        setPriceInr(catalog.guest_pass?.price_inr ?? 100);
        if (!profileData.site_id?.trim()) {
          setError(
            "Your account has no site assigned. Ask your administrator to assign you to a site before purchasing a guest pass."
          );
        } else if (catalog.guest_pass && !catalog.guest_pass.enabled) {
          setError("Guest passes are not available for your site right now. Contact your administrator.");
        } else {
          setError("");
        }
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        const base =
          typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
            ? process.env.NEXT_PUBLIC_API_URL
            : "(not set — defaults to http://localhost:8000)";
        if (/failed to fetch|networkerror|load failed/i.test(msg)) {
          setError(
            `Cannot reach the API (${base}). Start the MealTrace backend, set NEXT_PUBLIC_API_URL in frontend/.env.local if it is not on localhost:8000, and ensure you are logged in.`
          );
        } else {
          setError(msg || "Unable to load your profile.");
        }
      })
      .finally(() => setSiteLoading(false));
  }, []);

  useEffect(() => {
    if (siteLoading) return;
    void hydrateActivePass();
  }, [siteLoading, hydrateActivePass]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      if (!siteId) throw new Error("Missing site assignment");

      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error("Razorpay SDK failed to load. Are you online?");
      }

      const order = await api.post<{
        razorpay_key_id: string;
        amount: number;
        currency: string;
        order_id: string;
      }>("/payments/create-order", {
        guest_pass: true,
      });

      const options = {
        key: order.razorpay_key_id,
        amount: order.amount,
        currency: order.currency,
        name: "MealTrace Digital",
        description: "Guest Pass Purchase",
        order_id: order.order_id,
        prefill: {
          email: profile?.email || undefined,
          contact: profile?.phone?.replace(/\D/g, "") || undefined,
        },
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          try {
            const res = await api.post<{
              id: string;
              qr_base64: string;
              status: string;
              expiry_at: string;
            }>("/guest-pass/purchase", {
              site_id: siteId,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setPassData({
              id: res.id,
              qr_base64: res.qr_base64,
              status: "UNUSED",
              expiry_at: res.expiry_at,
            });
          } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Payment succeeded but failed to generate pass");
          }
        },
        theme: {
          color: "#4f46e5",
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", function (response: { error?: { description?: string } }) {
        setError("Payment failed: " + (response.error?.description ?? "Unknown error"));
      });
      rzp.open();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate guest pass order");
    } finally {
      setLoading(false);
    }
  };

  const expiryLabel =
    passData?.expiry_at &&
    new Date(passData.expiry_at).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="min-h-screen bg-slate-50 p-6 pb-24 pt-8 animate-in fade-in duration-500">
      <div className="mb-8 flex items-center gap-4">
        <Link href="/resident" className="rounded-full bg-white p-2.5 shadow-sm">
          <ArrowLeft className="h-5 w-5 text-slate-700" />
        </Link>
        <h1 className="text-2xl font-black text-slate-900">Guest Pass</h1>
      </div>

      {!passData ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-indigo-50">
            <QrCode className="h-10 w-10 text-indigo-600" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">Generate One-Time Pass</h2>
          <p className="mb-4 text-sm text-slate-500">
            This will create a temporary QR code valid for a single meal. Your site price is{" "}
            <span className="font-bold text-slate-800">₹{priceInr}</span> (charged at checkout).
          </p>
          <p className="mb-8 text-xs font-medium leading-relaxed text-slate-500">
            After purchase, your guest pass QR stays on this page until it is <strong>used at a scan</strong> or{" "}
            <strong>expires</strong> (24 hours). You can leave and come back — it is saved to your account.
          </p>

          {error && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm font-semibold text-amber-800">
              {error}
            </p>
          )}

          <button
            onClick={() => void handleGenerate()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-4 font-bold text-white shadow-md shadow-indigo-200 transition-all disabled:opacity-60"
            disabled={loading || siteLoading || passesHydrating || !siteId?.trim() || !guestPassEnabled}
            title={!siteId?.trim() && !siteLoading ? "Site assignment required" : undefined}
          >
            {siteLoading || passesHydrating ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              `Generate Pass — ₹${priceInr}`
            )}
          </button>
        </div>
      ) : (
        <div className="animate-in zoom-in-95 rounded-3xl border border-indigo-50 bg-white p-8 text-center shadow-xl shadow-indigo-100/50">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-emerald-50 p-3 text-emerald-500">
              <CheckCircle2 className="h-8 w-8" />
            </div>
          </div>
          <h2 className="mb-1 text-xl font-black text-slate-900">Your guest pass</h2>
          <p className="mb-2 text-sm font-medium text-slate-500">
            {expiryLabel ? <>Valid until {expiryLabel}</> : "Valid for 24 hours from issue"}
          </p>
          <p className="mb-8 text-xs leading-relaxed text-slate-500">
            This QR is stored on your account until the pass is used or expires. You can safely leave this screen and
            return later.
          </p>

          <div className="relative mb-6 inline-block h-48 w-48 rounded-2xl border-4 border-indigo-50 bg-white p-4 shadow-inner">
            <Image
              fill
              src={`data:image/png;base64,${passData.qr_base64}`}
              alt="Guest Pass QR"
              className="object-contain"
              unoptimized
            />
          </div>

          <p className="rounded-xl bg-indigo-50 py-2 font-bold text-indigo-600">ID: {passData.id}</p>

          <button
            type="button"
            onClick={() => void hydrateActivePass()}
            className="mt-6 text-sm font-bold text-indigo-600 underline decoration-indigo-200 underline-offset-2"
          >
            Refresh status
          </button>
        </div>
      )}
    </div>
  );
}
