"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPatient = pathname?.startsWith("/patient");

  if (isPatient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
        {children}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
