"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Scan, Keyboard, UserCircle } from "lucide-react";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-neutral-900 pt-safe text-white">
      <main className="flex-1 overflow-y-auto pb-20 no-scrollbar relative z-0">
        {children}
      </main>
      
      <nav className="fixed bottom-0 w-full bg-neutral-950/90 backdrop-blur-xl border-t border-neutral-800 px-8 py-4 pb-safe flex justify-between items-center z-50">
        <NavItem href="/vendor" icon={<Scan />} label="Scan" active={pathname === "/vendor" || pathname === "/vendor/scan"} />
        <NavItem href="/vendor/manual" icon={<Keyboard />} label="Manual" active={pathname === "/vendor/manual"} />
        <NavItem href="/vendor/profile" icon={<UserCircle />} label="Profile" active={pathname === "/vendor/profile"} />
      </nav>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={`relative flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'text-amber-500 scale-105' : 'text-neutral-500 hover:text-neutral-300'}`}>
      {active && <div className="absolute -top-3 w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />}
      <div className={`[&>svg]:w-6 [&>svg]:h-6 transition-all ${active ? 'stroke-[2.5px] drop-shadow-[0_0_10px_rgba(245,158,11,0.5)]' : 'stroke-2'}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold tracking-wide uppercase">{label}</span>
    </Link>
  );
}
