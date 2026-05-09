"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Upload,
  Shield,
  GitBranch,
  Stethoscope,
  Sun,
  TrendingUp,
  Settings,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/upload", label: "Upload CSV", icon: Upload },
  { href: "/insurance", label: "Insurance", icon: Shield },
  { href: "/referrals", label: "Referrals", icon: GitBranch },
  { href: "/prep", label: "Prep Push", icon: Stethoscope },
  { href: "/briefing", label: "Briefing", icon: Sun },
  { href: "/revenue", label: "Revenue", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const clinicName = process.env.NEXT_PUBLIC_CLINIC_NAME ?? "Demo Clinic";

  return (
    <aside className="w-56 shrink-0 bg-slate-900 text-white flex flex-col h-full">
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-400" />
          <div>
            <p className="font-semibold text-sm leading-tight">{clinicName}</p>
            <p className="text-xs text-slate-400">No-Show Predictor</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              pathname === href
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-slate-700">
        <p className="text-xs text-slate-500">v0.1.0 · Hackathon Build</p>
      </div>
    </aside>
  );
}
