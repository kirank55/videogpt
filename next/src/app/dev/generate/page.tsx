"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { PromptForm } from "@/components/generate/PromptForm";
import { PlayerCard } from "@/components/player";
import type { VideoProject } from "@/lib/ui/renderer";
import type { VideoBrief, SupportedDuration } from "@/lib/agent/schemas/brief";
import type { StylePreset } from "@/lib/agent/schemas/brief";

interface StyleVariant {
  style: StylePreset;
  brief: VideoBrief;
  project: VideoProject;
}

interface AllStylesResponse {
  projectName: string;
  summary: string;
  variants: StyleVariant[];
  error?: string;
}

export default function DevPresetGalleryPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<SupportedDuration>(15);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AllStylesResponse | null>(null);

  const handleSubmit = async (submittedPrompt: string) => {
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/dev/generate-all-styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: submittedPrompt, duration }),
      });

      const data = (await res.json()) as AllStylesResponse;

      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      setResponse(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden h-full">
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-6 pb-4">
        <TopBar
          title="Dev — Generate All Designs"
          actions={
            <button
              type="button"
              onClick={() => router.push("/dev")}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-all duration-150 active:scale-95 cursor-pointer"
            >
              ← Back to Dev
            </button>
          }
        />

        <div className="card p-5 space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Submit one prompt to generate the same video under all 5 style presets
            (modern, brutalist, sketch, neon-glow, minimal). Uses a single LLM call;
            variants are produced by re-expanding the brief with each style key.
          </p>
          <div className="grid gap-2 border-t border-border/50 pt-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Title", "/dev/generate/title"],
              ["Phase 1", "/dev/generate/phase-1"],
              ["Main Diagram", "/dev/generate/main-diagram"],
              ["Conclusion", "/dev/generate/conclusion"],
            ].map(([label, href]) => (
              <button
                key={href}
                type="button"
                onClick={() => router.push(href)}
                className="cursor-pointer rounded-xl border border-border bg-surface px-4 py-3 text-left text-sm font-semibold text-foreground transition-all hover:border-primary/40 hover:bg-primary/5 hover:text-primary active:scale-[0.98]"
              >
                {label} →
              </button>
            ))}
          </div>
          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
              {error}
            </div>
          )}
          {response && !error && (
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">
                {response.projectName}
              </p>
              {response.summary && (
                <p className="text-xs text-muted-foreground mt-1">
                  {response.summary}
                </p>
              )}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="w-full">
            <PlayerLoadingSlot />
          </div>
        )}

        {!isLoading && response && response.variants.length > 0 && (
          <div className="space-y-4">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {response.variants.map((variant) => (
                <div key={variant.style} className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 px-1">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/20">
                      {variant.style}
                    </span>
                  </div>
                  <PlayerCard
                    project={variant.project}
                    autoPlay={true}
                    showControls={true}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 pt-2">
        <PromptForm
          prompt={prompt}
          setPrompt={setPrompt}
          duration={duration}
          onChangeDuration={(d) => setDuration(d as SupportedDuration)}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          minLength={20}
        />
      </div>
    </div>
  );
}

// ── Local loading slot ────────────────────────────────────────────────────────
// Lightweight skeleton shown while waiting for the dev endpoint. Kept local to
// this dev page so the main app's PlayerLoadingCard stays unchanged.

function PlayerLoadingSlot() {
  return (
    <div className="card overflow-hidden bg-surface-raised flex flex-col">
      <div className="border-b border-border/80 px-5 py-4">
        <p className="text-sm font-bold text-foreground animate-pulse">
          Generating all style variants...
        </p>
        <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mt-0.5 animate-pulse">
          One LLM call, five re-expansions
        </p>
      </div>
      <div className="aspect-video flex flex-col items-center justify-center bg-black/15 dark:bg-black/35 rounded-2xl m-4 min-h-[300px] gap-4 p-6 text-center border border-dashed border-border/40">
        <div className="size-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <p className="text-sm font-bold text-foreground">
          Calling OpenRouter...
        </p>
      </div>
    </div>
  );
}
