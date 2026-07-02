"use client";

import { useState, useRef, useEffect } from "react";
import { HighLevelDiagram } from "@/components/architecture/HighLevelDiagram";
import { PIPELINE_STAGES } from "@/lib/others/architecture/stages";

export default function WorkingPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement | null>(null);

  const stage = selectedId
    ? PIPELINE_STAGES.find((s) => s.id === selectedId) ?? null
    : null;
  const selectedIndex = stage
    ? PIPELINE_STAGES.findIndex((s) => s.id === stage.id)
    : -1;
  const prev = selectedIndex > 0 ? PIPELINE_STAGES[selectedIndex - 1] : null;
  const next =
    selectedIndex >= 0 && selectedIndex < PIPELINE_STAGES.length - 1
      ? PIPELINE_STAGES[selectedIndex + 1]
      : null;

  // On mobile, scroll the detail panel into view when a node is clicked.
  useEffect(() => {
    if (stage && detailRef.current) {
      const isMobile = window.matchMedia("(max-width: 767px)").matches;
      if (isMobile) {
        detailRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }, [stage]);

  return (
    <div className="mx-auto h-full max-w-5xl overflow-y-auto px-2 py-6 md:px-4">
      <header className="mb-5 space-y-1.5">
        <h1 className="text-xl font-bold tracking-tight text-foreground">
          How VideoGPT Works
        </h1>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Each prompt flows through {PIPELINE_STAGES.length} stages, from natural
          language to rendered pixels. Click a node to see its details.
        </p>
      </header>

      <div className="space-y-5">
        {/* ── Horizontal diagram (scrolls horizontally) ────────────────── */}
        <HighLevelDiagram onSelect={setSelectedId} selectedId={selectedId} />

        {/* ── Detail panel ─────────────────────────────────────────────── */}
        <div ref={detailRef}>
          {stage ? (
            <article className="space-y-4 rounded-xl border border-border bg-surface p-5">
              <header className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/70">
                  Step {selectedIndex + 1} of {PIPELINE_STAGES.length}
                </div>
                <h2 className="text-lg font-bold tracking-tight text-foreground">
                  {stage.label}
                </h2>
                <p className="text-sm text-muted-foreground">{stage.summary}</p>
              </header>

              <dl className="space-y-2.5 rounded-xl border border-border/60 bg-foreground/[0.02] p-3.5">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                    File / Symbol
                  </dt>
                  <dd className="mt-0.5 break-all font-mono text-xs text-foreground/90">
                    {stage.file}
                    {stage.symbol ? (
                      <span className="text-muted-foreground"> — {stage.symbol}</span>
                    ) : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                    State / Data shape
                  </dt>
                  <dd className="mt-0.5 text-xs text-foreground/90">
                    {stage.dataShape}
                  </dd>
                </div>
              </dl>

              <p className="text-sm leading-relaxed text-foreground/85">
                {stage.details}
              </p>

              <nav className="flex items-center justify-between gap-3 border-t border-border/60 pt-4">
                {prev ? (
                  <button
                    type="button"
                    onClick={() => setSelectedId(prev.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-foreground/5 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5 shrink-0 text-muted-foreground">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="min-w-0">
                      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground/70">Previous</span>
                      <span className="block truncate text-xs font-semibold text-foreground">{prev.label}</span>
                    </span>
                  </button>
                ) : (
                  <span className="flex-1" />
                )}
                {next ? (
                  <button
                    type="button"
                    onClick={() => setSelectedId(next.id)}
                    className="flex min-w-0 flex-1 items-center justify-end gap-2 rounded-lg border border-border px-3 py-2 text-right transition-colors hover:bg-foreground/5 cursor-pointer"
                  >
                    <span className="min-w-0">
                      <span className="block text-[10px] uppercase tracking-wide text-muted-foreground/70">Next</span>
                      <span className="block truncate text-xs font-semibold text-foreground">{next.label}</span>
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5 shrink-0 text-muted-foreground">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <span className="flex-1" />
                )}
              </nav>
            </article>
          ) : (
            <div className="flex h-full min-h-[200px] items-center justify-center rounded-xl border border-dashed border-border/60 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Click a node in the diagram to see its details — file, data
                shape, and low-level behaviour.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
