"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Scan, Keyboard, UserCircle } from "lucide-react";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-gray-50 pt-safe text-slate-900">
      <div className="absolute top-0 left-0 -z-10 h-48 w-full rounded-b-[40px] bg-gradient-to-br from-indigo-600 to-purple-700 shadow-lg shadow-indigo-500/20" />
      <main className="flex-1 overflow-y-auto pb-20 no-scrollbar relative z-0">
        {children}
      </main>
      
      <nav className="fixed bottom-0 w-full bg-white/80 backdrop-blur-xl border-t border-gray-200/50 px-8 py-4 pb-safe flex justify-between items-center shadow-[0_-15px_40px_rgba(0,0,0,0.06)] z-50">
        <NavItem href="/vendor" icon={<Scan />} label="Scan" active={pathname === "/vendor" || pathname === "/vendor/scan"} />
        <NavItem href="/vendor/manual" icon={<Keyboard />} label="Manual" active={pathname === "/vendor/manual"} />
        <NavItem href="/vendor/profile" icon={<UserCircle />} label="Profile" active={pathname === "/vendor/profile"} />
      </nav>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={`relative flex flex-col items-center gap-1 transition-all duration-300 ${active ? 'text-indigo-600 scale-105' : 'text-gray-400 hover:text-gray-600'} active:scale-95`}>
      {active && <div className="absolute -top-3 w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce" />}
      <div className={`[&>svg]:w-6 [&>svg]:h-6 transition-all ${active ? 'drop-shadow-md stroke-[2.5px]' : 'stroke-2'}`}>
        {icon}
      </div>
      <span className="text-[11px] font-bold tracking-wide">{label}</span>
    </Link>
  );
}
