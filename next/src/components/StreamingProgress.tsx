"use client";

import { useStore } from "@/lib/ui/store";

const PHASE_LABELS: Record<string, string> = {
  "generating-sections": "Generating three authored sections...",
  composing: "Composing the final timeline...",
};

export function useStreamingProgress() {
  const tokenCount = useStore((state) => state.streamingTokenCount);
  const charCount = useStore((state) => state.streamingCharCount);
  const loadingPhase = useStore((state) => state.loadingPhase);
  const isStreaming = charCount > 0;
  const barWidthPct = isStreaming ? Math.min(95, 20 + charCount / 80) : 0;
  const phaseLabel = loadingPhase
    ? (PHASE_LABELS[loadingPhase] ?? loadingPhase)
    : "Connecting to model...";
  return { tokenCount, charCount, isStreaming, barWidthPct, phaseLabel };
}

export function StreamingProgress(
  { showSpinner = true }: { showSpinner?: boolean } = {},
) {
  const { tokenCount, charCount, isStreaming, barWidthPct, phaseLabel } = useStreamingProgress();
  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex items-center gap-3">
        {showSpinner && (
          <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary/35 border-t-primary" />
        )}
        <span className="font-semibold text-foreground">{phaseLabel}</span>
        {isStreaming && (
          <span className="ml-auto font-mono text-[11px] tabular-nums text-primary">
            ~{tokenCount.toLocaleString()} tokens
          </span>
        )}
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-border/30">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{
            width: isStreaming ? `${barWidthPct}%` : "12%",
            animation: isStreaming ? "none" : "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
      {isStreaming && (
        <p className="truncate font-mono text-[10px] text-muted-foreground/50">
          {charCount.toLocaleString()} chars received
        </p>
      )}
    </div>
  );
}
