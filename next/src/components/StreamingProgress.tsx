"use client";

import { useStore } from "@/lib/ui/store";

// ── Shared streaming progress ─────────────────────────────────────────────────
//
// Single source of truth for the loading-state visuals (phase label, spinner,
// token count, progress bar, char count). Used by both the chat text bubble
// (StreamingProgress in MessageBubble) and the canvas skeleton
// (PlayerLoadingCard in PlayerCard) so they always show the same information.

const PHASE_LABELS: Record<string, string> = {
  "prompt-built": "Sending prompt to server…",
  "calling-openrouter": "Calling OpenRouter…",
  "streaming": "Streaming tokens from LLM…",
  "expanding": "Executing pipeline — expanding brief…",
  "retrying": "Retrying…",
};

export function useStreamingProgress() {
  const tokenCount = useStore((s) => s.streamingTokenCount);
  const charCount = useStore((s) => s.streamingCharCount);
  const loadingPhase = useStore((s) => s.loadingPhase);
  const retryCount = useStore((s) => s.retryCount);

  const isStreaming = charCount > 0;
  const isRetrying = loadingPhase === "retrying";
  const barWidthPct = isStreaming ? Math.min(95, 20 + charCount / 80) : 0;
  const phaseLabel = isRetrying
    ? `Retrying… (attempt ${retryCount}/3)`
    : loadingPhase
      ? (PHASE_LABELS[loadingPhase] ?? loadingPhase)
      : "Connecting to model…";

  return { tokenCount, charCount, isStreaming, isRetrying, barWidthPct, phaseLabel, retryCount };
}

/**
 * The compact streaming progress block: spinner + phase label + token count
 * on the first row, progress bar, then char count. Renders the same visuals
 * whether it's in the chat bubble or the canvas skeleton.
 */
export function StreamingProgress({ showSpinner = true }: { showSpinner?: boolean } = {}) {
  const { tokenCount, charCount, isStreaming, barWidthPct, phaseLabel } = useStreamingProgress();

  return (
    <div className="flex flex-col gap-2.5 w-full">
      <div className="flex items-center gap-3">
        {showSpinner && (
          <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary/35 border-t-primary" />
        )}
        <span className="font-semibold text-foreground">
          {phaseLabel}
        </span>
        {isStreaming && (
          <span className="ml-auto text-[11px] font-mono text-primary tabular-nums">
            ~{tokenCount.toLocaleString()} tokens
          </span>
        )}
      </div>
      <div className="w-full h-1 rounded-full bg-border/30 overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{
            width: isStreaming ? `${barWidthPct}%` : "12%",
            animation: isStreaming ? "none" : "pulse 1.5s ease-in-out infinite",
          }}
        />
      </div>
      {isStreaming && (
        <p className="text-[10px] font-mono text-muted-foreground/50 truncate">
          {charCount.toLocaleString()} chars received
        </p>
      )}
    </div>
  );
}
