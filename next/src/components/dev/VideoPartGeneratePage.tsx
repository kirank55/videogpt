"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PromptForm } from "@/components/generate/PromptForm";
import { TopBar } from "@/components/layout/TopBar";
import { PlayerCard } from "@/components/player";
import type { SupportedDuration } from "@/lib/others/schemas/duration";
import type {
  GenerateVideoPartResponse,
  VideoPartKind,
} from "@/lib/agent/videoParts/schemas";
import { saveDevGeneratedProject } from "@/lib/ui/devGeneratedProjects";

type VideoPartGeneratePageProps = {
  part: VideoPartKind;
  title: string;
  description: string;
};

type ErrorResponse = { error?: string };

export function VideoPartGeneratePage({
  part,
  title,
  description,
}: VideoPartGeneratePageProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState<SupportedDuration>(5);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateVideoPartResponse | null>(null);

  const handleSubmit = async (submittedPrompt: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/dev/generate-part", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ part, prompt: submittedPrompt, duration }),
      });
      const data = (await response.json()) as GenerateVideoPartResponse | ErrorResponse;
      if (!response.ok) {
        throw new Error("error" in data && data.error ? data.error : `HTTP ${response.status}`);
      }
      const generated = data as GenerateVideoPartResponse;
      saveDevGeneratedProject({
        part,
        prompt: submittedPrompt,
        project: generated.project,
        content: generated.content,
      });
      setResult(generated);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4 pr-1">
        <TopBar
          title={title}
          actions={
            <button
              type="button"
              onClick={() => router.push("/dev/generate")}
              className="cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-all duration-150 hover:bg-foreground/5 hover:text-foreground active:scale-95"
            >
              ← Back to Generate Tools
            </button>
          }
        />

        <section className="card space-y-3 p-5">
          <div className="flex items-start gap-3">
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
              {part}
            </span>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-700 dark:text-rose-400">
              {error}
            </div>
          )}
        </section>

        {(isLoading || result) && (
          <PlayerCard
            project={result?.project}
            isLoading={isLoading}
            autoPlay
            showControls
          />
        )}
      </div>

      <div className="shrink-0 pt-2">
        <PromptForm
          prompt={prompt}
          setPrompt={setPrompt}
          duration={duration}
          onChangeDuration={(value) => setDuration(value as SupportedDuration)}
          isLoading={isLoading}
          onSubmit={handleSubmit}
          minLength={20}
        />
      </div>
    </div>
  );
}
