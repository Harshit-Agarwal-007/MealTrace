import Link from "next/link";
import { AlertTriangle, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900 px-6">
      <div className="bg-white p-8 rounded-[32px] shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col items-center max-w-sm text-center">
        <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-6">
           <AlertTriangle className="w-10 h-10 text-amber-600" />
        </div>
        <h1 className="text-3xl font-black mb-2">404</h1>
        <h2 className="text-lg font-bold text-slate-700 mb-4">Page Not Found</h2>
        <p className="text-slate-500 text-sm mb-8">The screen you are looking for doesn't exist or has been moved from the system.</p>
        
        <Link href="/" className="bg-indigo-600 text-white w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-500/30">
           <Home className="w-5 h-5" /> Return Home
        </Link>
      </div>
    </div>
  );
}
