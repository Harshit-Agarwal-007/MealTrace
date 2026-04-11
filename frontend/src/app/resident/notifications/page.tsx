"use client";
import { ArrowLeft, Bell, Settings, CreditCard, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function ResidentNotifications() {
  const notifications = [
    { id: 1, title: "Payment Successful", msg: "₹4,500 was added to your account for the 30-Day Plan.", time: "10 min ago", icon: <CreditCard className="w-5 h-5 text-emerald-500" />, read: false },
    { id: 2, title: "Broadcast: System Alert", msg: "Main cafeteria will be delayed by 30 mins for Lunch.", time: "2 hours ago", icon: <Bell className="w-5 h-5 text-blue-500" />, read: false },
    { id: 3, title: "Device Verified", msg: "Your new device has been securely verified for QR caching.", time: "Yesterday", icon: <ShieldCheck className="w-5 h-5 text-indigo-500" />, read: true }
  ];

  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
          <Link href="/resident" className="inline-flex items-center text-indigo-600 font-bold hover:text-indigo-700 transition-colors">
             <ArrowLeft className="w-5 h-5 mr-2" /> Back
          </Link>
          <Link href="/resident/settings" className="p-2 bg-indigo-50 rounded-full text-indigo-600 active:scale-95 transition-transform">
             <Settings className="w-5 h-5" />
          </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-900 mb-8">Notifications</h1>
      
      <div className="space-y-3">
         {notifications.map(n => (
            <div key={n.id} className={`p-4 rounded-[24px] border transition-all flex gap-4 ${n.read ? 'bg-transparent border-gray-100' : 'bg-white border-indigo-100 shadow-[0_8px_30px_rgb(0,0,0,0.06)]'}`}>
               <div className={`p-3 rounded-full h-fit shrink-0 ${n.read ? 'bg-gray-100' : 'bg-indigo-50'}`}>
                  {n.icon}
               </div>
               <div>
                  <div className="flex justify-between items-start gap-4 mb-1">
                     <h3 className={`font-bold text-sm ${n.read ? 'text-gray-700' : 'text-gray-900'}`}>{n.title}</h3>
                     <span className="text-[10px] text-gray-400 font-medium shrink-0 pt-0.5">{n.time}</span>
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed">{n.msg}</p>
               </div>
            </div>
         ))}
      </div>
    </div>
  )
}
