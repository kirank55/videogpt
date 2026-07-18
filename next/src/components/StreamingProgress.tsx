"use client";

import { useStore } from "@/lib/ui/store";
import type { GenerationOperation } from "@/types/generate";

function phaseLabel(operation: GenerationOperation | undefined): string {
  if (!operation || operation.status === "connecting") return "Connecting to model…";
  if (operation.status === "planning") return "Planning the video scenes…";
  if (operation.status === "composing") return "Composing the final timeline…";
  return "Generating the video scenes...";
}

export function StreamingProgress({
  sessionId,
  showSpinner = true,
}: {
  sessionId?: string;
  showSpinner?: boolean;
}) {
  const operation = useStore((state) => sessionId ? state.operations[sessionId] : undefined);
  const parts = Object.keys(operation?.parts ?? {});
  const exactTokens = operation?.completionTokens !== undefined
    && parts.length > 0
    && parts.every((part) => operation.parts[part].status === "complete");
  const tokenCount = exactTokens
    ? operation?.completionTokens ?? 0
    : operation?.estimatedTokens ?? 0;

  return (
    <div className="flex w-full flex-col gap-3" role="status" aria-live="polite" aria-atomic="true">
      <div className="flex items-center gap-3">
        {showSpinner && (
          <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-primary/35 border-t-primary" aria-hidden="true" />
        )}
        <span className="font-semibold text-foreground">{phaseLabel(operation)}</span>
        {tokenCount > 0 && (
          <span className="ml-auto font-mono text-[11px] tabular-nums text-primary">
            {exactTokens ? "" : "~"}{tokenCount.toLocaleString()} tokens
          </span>
        )}
      </div>

      <div className="grid gap-1.5 text-left">
        {parts.map((part) => {
          const progress = operation?.parts[part];
          const status = progress?.status ?? "waiting";
          return (
            <div key={part} className="flex items-center gap-2 text-xs">
              <span className={`size-1.5 rounded-full ${
                status === "complete"
                  ? "bg-emerald-500"
                  : status === "streaming"
                    ? "animate-pulse bg-primary"
                    : "bg-muted-foreground/30"
              }`} aria-hidden="true" />
              <span className="text-foreground/80">{progress?.label ?? part}</span>
              <span className="ml-auto text-muted-foreground">
                {status === "complete" ? "Complete" : status === "streaming" ? "Streaming" : "Waiting"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="h-1 w-full overflow-hidden rounded-full bg-border/30">
        <div className="h-full w-1/3 animate-pulse rounded-full bg-primary" />
      </div>
    </div>
  );
}
