"use client";
import { ArrowLeft, Bell, Settings, CreditCard, ShieldCheck, Loader2, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/apiClient";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  created_at: string;
  read: boolean;
}

function timeAgo(iso: string): string {
  try {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  } catch {
    return "";
  }
}

const TYPE_ICON_MAP: Record<string, { icon: React.ReactNode; color: string }> = {
  PAYMENT_CONFIRMED: { icon: <CreditCard className="w-5 h-5 text-emerald-500" />, color: "bg-emerald-50" },
  ADMIN_BROADCAST: { icon: <Bell className="w-5 h-5 text-blue-500" />, color: "bg-blue-50" },
  GUEST_PASS_ISSUED: { icon: <ShieldCheck className="w-5 h-5 text-purple-500" />, color: "bg-purple-50" },
  CREDIT_OVERRIDE: { icon: <CreditCard className="w-5 h-5 text-amber-500" />, color: "bg-amber-50" },
};

export default function ResidentNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNotifications = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<{ notifications: Notification[] }>("/resident/notifications");
      setNotifications(data.notifications ?? []);
    } catch {
      setError("Could not load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <Link href="/resident" className="inline-flex items-center text-indigo-600 font-bold hover:text-indigo-700 transition-colors">
          <ArrowLeft className="w-5 h-5 mr-2" /> Back
        </Link>
        <div className="flex gap-2">
          <button
            onClick={fetchNotifications}
            className="p-2 bg-indigo-50 rounded-full text-indigo-600 active:scale-95 transition-transform"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <Link href="/resident/settings" className="p-2 bg-indigo-50 rounded-full text-indigo-600 active:scale-95 transition-transform">
            <Settings className="w-5 h-5" />
          </Link>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Notifications</h1>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm font-medium text-center">
          {error}
        </div>
      )}

      {!loading && !error && notifications.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-400">
          <Bell className="w-12 h-12 opacity-30" />
          <p className="font-semibold">No notifications yet</p>
          <p className="text-xs">Broadcasts from admin will appear here</p>
        </div>
      )}

      <div className="space-y-3">
        {notifications.map((n) => {
          const iconInfo = TYPE_ICON_MAP[n.type] ?? {
            icon: <Bell className="w-5 h-5 text-gray-500" />,
            color: "bg-gray-100",
          };
          return (
            <div
              key={n.id}
              className={`p-4 rounded-[24px] border transition-all flex gap-4 ${
                n.read ? "bg-transparent border-gray-100" : "bg-white border-indigo-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
              }`}
            >
              <div className={`p-3 rounded-full h-fit shrink-0 ${n.read ? "bg-gray-100" : iconInfo.color}`}>
                {iconInfo.icon}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start gap-4 mb-1">
                  <h3 className={`font-bold text-sm ${n.read ? "text-gray-700" : "text-gray-900"}`}>{n.title}</h3>
                  <span className="text-[10px] text-gray-400 font-medium shrink-0 pt-0.5">{timeAgo(n.created_at)}</span>
                </div>
                <p className="text-sm text-gray-500 leading-relaxed">{n.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
