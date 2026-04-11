"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Clock, User } from "lucide-react";

export default function ResidentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-gray-50 pt-safe">
      <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-br from-indigo-600 to-purple-700 -z-10 rounded-b-[40px] shadow-lg shadow-indigo-500/20" />
      
      {/* Dynamic Content */}
      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-6 no-scrollbar">
        {children}
      </main>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 w-full bg-white/80 backdrop-blur-xl border-t border-gray-200/50 px-8 py-4 pb-safe flex justify-between items-center shadow-[0_-15px_40px_rgba(0,0,0,0.06)] z-50">
        <NavItem href="/resident" icon={<Home />} label="Home" active={pathname === "/resident"} />
        <NavItem href="/resident/history" icon={<Clock />} label="History" active={pathname === "/resident/history"} />
        <NavItem href="/resident/profile" icon={<User />} label="Profile" active={pathname === "/resident/profile"} />
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
