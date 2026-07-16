"use client";

import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";

const TOOLS = [
  ["Title", "/dev/generate/title", "Deterministic preview from concise title copy."],
  ["Summary", "/dev/generate/summary", "Compact direct summary timeline."],
  ["Main Diagram", "/dev/generate/main-diagram", "Deep direct mechanism timeline."],
  ["Conclusion", "/dev/generate/conclusion", "Deterministic preview from one closing line."],
] as const;

export default function DevGenerateHubPage() {
  const router = useRouter();
  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <TopBar
        title="Dev - Generation Tools"
        actions={
          <button
            type="button"
            onClick={() => router.push("/dev")}
            className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            Back to Dev
          </button>
        }
      />
      <main className="mt-6 grid gap-4 overflow-y-auto md:grid-cols-2">
        {TOOLS.map(([label, href, description]) => (
          <button
            key={href}
            type="button"
            onClick={() => router.push(href)}
            className="card cursor-pointer space-y-2 p-6 text-left transition hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="text-lg font-bold text-foreground">{label}</span>
            <p className="text-sm text-muted-foreground">{description}</p>
          </button>
        ))}
      </main>
    </div>
  );
}
