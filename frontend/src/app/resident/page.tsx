"use client";

/**
 * Resident Dashboard — MealTrace
 *
 * Parallel fetching:
 *  - GET /resident/profile
 *  - GET /resident/balance
 *  - GET /resident/qr-code
 *
 * Also implements offline fallback for the QR code using localStorage.
 */

import { useState, useEffect } from "react";
import { QrCode, CreditCard, PlusCircle, Maximize, Bell, Loader2, WifiOff } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/apiClient";
import Image from "next/image";

interface Profile { name: string; email: string; dietary_preference: string; }
interface Balance { current_balance: number; plan_name?: string; plan_expires_at?: string; }
interface QrResponse { qr_code_base64: string; }

export default function ResidentDashboard() {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [profile, setProfile] = useState<Profile | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [isOfflineQr, setIsOfflineQr] = useState(false);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [profData, balData, qrData] = await Promise.all([
          api.get<Profile>("/resident/profile"),
          api.get<Balance>("/resident/balance").catch(() => ({ current_balance: 0 })),
          api.get<QrResponse>("/resident/qr-code").catch(() => null),
        ]);

        setProfile(profData);
        setBalance(balData as Balance);
        
        if (qrData?.qr_code_base64) {
          setQrCode(qrData.qr_code_base64);
          localStorage.setItem("offline_qr", qrData.qr_code_base64);
          setIsOfflineQr(false);
        } else {
          tryLoadOfflineQr();
        }
      } catch (err) {
        // Fallback to offline QR if full network fail
        tryLoadOfflineQr();
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const tryLoadOfflineQr = () => {
    const cached = localStorage.getItem("offline_qr");
    if (cached) {
      setQrCode(cached);
      setIsOfflineQr(true);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 pt-8 animate-in fade-in duration-500 pb-24 relative">
      {/* Fullscreen QR Modal */}
      {expanded && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-8 animate-in zoom-in-95 duration-200">
           <h2 className="text-2xl font-bold mb-8">Scan to Eat</h2>
           <div className="w-72 h-72 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl flex items-center justify-center border-4 border-indigo-100 shadow-2xl mb-12 relative overflow-hidden p-4">
              {qrCode ? (
                 <Image src={`data:image/png;base64,${qrCode}`} alt="QR Code" fill className="object-contain mix-blend-multiply" unoptimized />
              ) : (
                 <QrCode className="w-32 h-32 text-indigo-200" />
              )}
           </div>
           {isOfflineQr && (
             <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-xl mb-6 font-medium text-sm">
               <WifiOff className="w-4 h-4" /> Using offline QR
             </div>
           )}
           <button 
             onClick={() => setExpanded(false)}
             className="bg-slate-100 text-slate-600 font-bold px-8 py-3 rounded-full hover:bg-slate-200"
           >
              Close
           </button>
        </div>
      )}

       {/* Header */}
       <div className="flex justify-between items-center text-white mb-8">
         <div>
           <p className="text-indigo-100 text-sm font-medium">Hello,</p>
           <h1 className="text-2xl font-bold">{profile?.name || "Resident"}</h1>
         </div>
         <Link href="/resident/notifications" className="bg-white/10 p-2.5 rounded-full hover:bg-white/20 transition-colors active:scale-95 relative">
            <Bell className="w-5 h-5 text-white" />
         </Link>
       </div>

       {/* Balance Card */}
       <div className="bg-white/90 backdrop-blur-md rounded-[32px] p-7 shadow-2xl shadow-indigo-500/10 border border-white/50 flex flex-col justify-between relative overflow-hidden group">
         <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full blur-3xl -mr-10 -mt-10 opacity-70 group-hover:scale-110 transition-transform duration-700"></div>
         <p className="text-gray-500 font-semibold text-sm flex items-center gap-2"><CreditCard className="w-4 h-4 text-indigo-400"/> meal credits</p>
         <h2 className="text-6xl font-black text-gray-900 mt-2 mb-2 z-10 tracking-tight">
           {balance?.current_balance ?? 0}
         </h2>
         <p className="text-indigo-700 text-xs font-bold bg-indigo-50/80 backdrop-blur-sm w-max px-4 py-1.5 rounded-full mt-2 border border-indigo-100/50">
           {balance?.plan_name ? `${balance.plan_name} Active` : "Pay-As-You-Go"}
         </p>
       </div>

       {/* QR Code Section */}
       <div className="bg-white rounded-[32px] p-8 shadow-xl shadow-gray-200/50 flex flex-col items-center justify-center space-y-5 border border-gray-100 mt-4 relative">
          <button 
            onClick={() => setExpanded(true)} 
            className="absolute top-4 right-4 text-gray-400 hover:text-indigo-600 bg-gray-50 p-2 rounded-full transition-colors focus:outline-none"
          >
            <Maximize className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <p className="text-gray-500 font-medium tracking-wide text-sm">Scan at the counter</p>
            {isOfflineQr && <p className="text-[10px] text-amber-500 font-bold uppercase mt-1 flex items-center justify-center gap-1"><WifiOff className="w-3 h-3"/> Offline Mode</p>}
          </div>

          <div 
            onClick={() => setExpanded(true)} 
            className="bg-white p-5 rounded-[2.5rem] shadow-[inset_0_-4px_10px_rgba(0,0,0,0.02),0_10px_30px_rgba(0,0,0,0.05)] relative group cursor-pointer transition-all duration-300 hover:scale-105 active:scale-95"
          >
             <div className="w-40 h-40 relative">
               {qrCode ? (
                  <Image src={`data:image/png;base64,${qrCode}`} alt="QR Code" fill className="object-contain mix-blend-multiply drop-shadow-sm group-hover:opacity-90 transition-opacity" unoptimized />
               ) : (
                  <QrCode className="w-full h-full text-slate-200" strokeWidth={1} />
               )}
             </div>
             
             <div className="absolute inset-0 bg-indigo-600/5 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity rounded-[2.5rem] flex items-center justify-center">
                 <Maximize className="text-indigo-600 w-10 h-10 drop-shadow-lg" />
             </div>
          </div>
          <p className="text-indigo-600 font-bold text-xs uppercase tracking-widest bg-indigo-50/50 py-1.5 px-4 rounded-full">
            Tap to expand
          </p>
       </div>

       {/* Quick Actions */}
       <div className="grid grid-cols-2 gap-4 mt-4">
         <Link href="/resident/plans" className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-[24px] p-5 flex flex-col items-center gap-3 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-1 transition-all active:scale-95">
           <PlusCircle className="w-7 h-7 opacity-90" />
           <span className="font-bold text-sm">Top Up Plan</span>
         </Link>
         <Link href="/resident/guest-pass" className="bg-white text-indigo-600 border border-indigo-50 rounded-[24px] p-5 flex flex-col items-center gap-3 shadow-lg shadow-gray-100/80 hover:shadow-gray-200 hover:-translate-y-1 transition-all active:scale-95">
           <QrCode className="w-7 h-7 opacity-90" />
           <span className="font-bold text-sm">Guest Pass</span>
         </Link>
       </div>
    </div>
  );
}
