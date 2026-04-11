"use client";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function VendorScanner() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const router = useRouter();

  const simulateSuccess = () => setScanResult("SUCCESS");
  const simulateFail = () => setScanResult("FAIL");

  if (scanResult === "SUCCESS") {
     return (
       <div className="h-full bg-emerald-500 flex flex-col items-center justify-center p-6 animate-in zoom-in duration-300 relative overflow-hidden z-10 w-full min-h-screen">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-400 to-emerald-600 -z-10"></div>
          <div className="bg-white/20 p-6 rounded-full mb-8 animate-[bounce_1s_ease-in-out]">
             <CheckCircle2 className="w-24 h-24 text-white" />
          </div>
          <h2 className="text-5xl font-black text-white mb-2 tracking-tight">Approved</h2>
          <p className="text-emerald-50 text-xl font-medium text-center">Harshit Agarwal</p>
          <div className="mt-8 bg-black/20 px-8 py-4 rounded-3xl flex items-center gap-4 backdrop-blur-md border border-white/10">
             <div className="text-center">
                <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest mb-1">Balance Remaining</p>
                <p className="text-white font-black text-4xl">41</p>
             </div>
          </div>
          <button onClick={() => setScanResult(null)} className="mt-12 bg-white text-emerald-600 font-bold text-lg px-8 py-4 rounded-2xl w-full active:scale-95 transition-transform shadow-xl shadow-emerald-900/20">
             Scan Next User
          </button>
       </div>
     )
  }

  if (scanResult === "FAIL") {
     return (
       <div className="h-full bg-red-500 flex flex-col items-center justify-center p-6 animate-in zoom-in duration-300 relative overflow-hidden z-10 w-full min-h-screen">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-400 to-red-600 -z-10"></div>
          <div className="bg-white/20 p-6 rounded-full mb-8 animate-pulse">
             <XCircle className="w-24 h-24 text-white" />
          </div>
          <h2 className="text-5xl font-black text-white mb-2 tracking-tight">Declined</h2>
          <p className="text-red-50 text-lg font-bold text-center bg-black/20 px-6 py-3 rounded-2xl mt-4 backdrop-blur-md border border-white/10">Outside Meal Window</p>
          
          <button onClick={() => setScanResult(null)} className="mt-12 bg-white text-red-600 font-bold text-lg px-8 py-4 rounded-2xl w-full active:scale-95 transition-transform shadow-xl shadow-red-900/20">
             Try Again
          </button>
       </div>
     )
  }

  return (
    <div className="h-[100dvh] flex flex-col animate-in fade-in absolute inset-0 w-full bg-black z-10">
       <div className="p-4 flex items-center relative z-20 bg-gradient-to-b from-black/80 to-transparent pb-10">
          <Link href="/vendor" className="bg-neutral-800/80 p-3 rounded-full absolute left-4 active:scale-95 transition-all backdrop-blur-sm border border-neutral-700">
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <h2 className="flex-1 text-center font-bold text-xl text-white tracking-wide">Scan QR</h2>
       </div>
       
       <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-black">
              <div className="w-full h-full opacity-40 bg-[url('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center grayscale blur-xs"></div>
          </div>
          
          {/* Scanner Overlay */}
          <div className="relative z-10 w-72 h-72 rounded-[40px] flex items-center justify-center mb-10 shadow-[0_0_0_1000px_rgba(0,0,0,0.6)]">
              {/* Corner markers */}
              <div className="w-12 h-12 border-t-8 border-l-8 border-amber-500 absolute top-0 left-0 rounded-tl-3xl"></div>
              <div className="w-12 h-12 border-t-8 border-r-8 border-amber-500 absolute top-0 right-0 rounded-tr-3xl"></div>
              <div className="w-12 h-12 border-b-8 border-l-8 border-amber-500 absolute bottom-0 left-0 rounded-bl-3xl"></div>
              <div className="w-12 h-12 border-b-8 border-r-8 border-amber-500 absolute bottom-0 right-0 rounded-br-3xl"></div>
              
              {/* Scanning line */}
              <div className="absolute top-0 w-full h-1 bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,1)] animate-[scan_2.5s_ease-in-out_infinite]"></div>
          </div>
          <p className="relative z-10 mt-8 font-bold text-white text-lg bg-black/40 px-6 py-2 rounded-full backdrop-blur-md tracking-wide">Align QR code within frame</p>

          <div className="relative z-10 flex gap-4 mt-auto mb-10 border border-neutral-800 bg-neutral-900/80 p-2 rounded-2xl backdrop-blur-xl">
             <button onClick={simulateSuccess} className="bg-emerald-500/20 text-emerald-400 px-6 py-3 rounded-xl text-sm font-bold hover:bg-emerald-500/30 transition-colors">Simulate Success</button>
             <button onClick={simulateFail} className="bg-red-500/20 text-red-400 px-6 py-3 rounded-xl text-sm font-bold hover:bg-red-500/30 transition-colors">Simulate Fail</button>
          </div>
       </div>
       <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
            0%, 100% { top: 5%; }
            50% { top: 95%; }
        }
       `}} />
    </div>
  )
}
