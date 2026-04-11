"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Users, Map, IndianRupee } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-screen h-[100dvh] bg-slate-50 pt-safe text-slate-900">
      <main className="flex-1 overflow-y-auto pb-20 no-scrollbar relative z-0">
        {children}
      </main>
      
      <nav className="fixed bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-slate-200 px-4 py-4 pb-safe flex justify-around items-center z-50">
        <NavItem href="/admin" icon={<LayoutDashboard />} label="Dashboard" active={pathname === "/admin"} />
        <NavItem href="/admin/residents" icon={<Users />} label="Residents" active={pathname?.startsWith("/admin/residents")} />
        <NavItem href="/admin/payments" icon={<IndianRupee />} label="Payments" active={pathname?.startsWith("/admin/payments")} />
        <NavItem href="/admin/sites" icon={<Map />} label="Sites" active={pathname?.startsWith("/admin/sites")} />
      </nav>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link href={href} className={`relative flex flex-col items-center gap-1.5 transition-all duration-300 ${active ? 'text-blue-600 scale-105' : 'text-slate-400 hover:text-slate-600'}`}>
      {active && <div className="absolute -top-3 w-1.5 h-1.5 bg-blue-600 rounded-full" />}
      <div className={`[&>svg]:w-6 [&>svg]:h-6 transition-all ${active ? 'stroke-[2.5px]' : 'stroke-2'}`}>
        {icon}
      </div>
      <span className="text-[10px] font-bold tracking-wide uppercase">{label}</span>
    </Link>
  );
}

