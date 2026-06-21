"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";

export function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDevPage = pathname.startsWith("/dev");

  if (isDevPage) {
    return <>{children}</>;
  }

  return (
    <div className="shell">
      <Sidebar />
      <section className="flex h-screen flex-col overflow-hidden p-6 md:p-10">
        {children}
      </section>
    </div>
  );
}
