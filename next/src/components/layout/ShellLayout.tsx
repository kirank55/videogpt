"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { FirefoxWarning } from "@/components/layout/FirefoxWarning";

export function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDevPage = pathname.startsWith("/dev");

  if (isDevPage) {
    return (
      <div className="flex flex-col">
        <FirefoxWarning />
        {children}
      </div>
    );
  }

  return (
    <div className="shell">
      <Sidebar />
      <section className="flex h-screen flex-col overflow-hidden p-6 md:p-10">
        <FirefoxWarning />
        {children}
      </section>
    </div>
  );
}
