"use client";

import { useEffect, useState } from "react";
import { HighLevelDiagram } from "./HighLevelDiagram";
import { PIPELINE_STAGES } from "@/lib/others/architecture/stages";

interface ArchitectureSlideOverProps {
  open: boolean;
  onClose: () => void;
}

export function ArchitectureSlideOver({ open, onClose }: ArchitectureSlideOverProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(false);

  // Reset to the overview each time the panel is reopened. Done during render
  // (the React-recommended alternative to setState-in-effect) so we don't
  // trigger cascading renders.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSelectedId(null);
  }

  // Escape to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const stage = PIPELINE_STAGES.find((s) => s.id === selectedId) ?? null;
  const selectedIndex = stage ? PIPELINE_STAGES.findIndex((s) => s.id === stage.id) : -1;
  const prev = selectedIndex > 0 ? PIPELINE_STAGES[selectedIndex - 1] : null;
  const next =
    selectedIndex >= 0 && selectedIndex < PIPELINE_STAGES.length - 1
      ? PIPELINE_STAGES[selectedIndex + 1]
      : null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onClose}
        aria-hidden
      />

      {/* Panel */}
      <aside
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-border bg-surface shadow-2xl transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-label="How it works"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="min-w-0">
            {stage ? (
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                All stages
              </button>
            ) : (
              <h2 className="text-sm font-bold tracking-tight text-foreground">
                How it works
              </h2>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground cursor-pointer"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {stage ? (
            <article className="space-y-4">
              <header className="space-y-1">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/70">
                  Step {selectedIndex + 1} of {PIPELINE_STAGES.length}
                </div>
                <h3 className="text-lg font-bold tracking-tight text-foreground">
                  {stage.label}
                </h3>
                <p className="text-sm text-muted-foreground">{stage.summary}</p>
              </header>

              <dl className="space-y-2.5 rounded-xl border border-border/60 bg-foreground/[0.02] p-3.5">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                    File / Symbol
                  </dt>
                  <dd className="mt-0.5 break-all font-mono text-xs text-foreground/90">
                    {stage.file}
                    {stage.symbol ? <span className="text-muted-foreground"> — {stage.symbol}</span> : null}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                    State / Data shape
                  </dt>
                  <dd className="mt-0.5 text-xs text-foreground/90">{stage.dataShape}</dd>
                </div>
              </dl>

              <p className="text-sm leading-relaxed text-foreground/85">{stage.details}</p>

              {/* Prev / Next nav */}
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
            <div className="space-y-3">
              <p className="px-1 text-xs leading-relaxed text-muted-foreground">
                Each prompt flows through 11 stages, from natural language to
                rendered pixels. Click any stage to drill into its file, data
                shape, and low-level behaviour.
              </p>
              <HighLevelDiagram onSelect={setSelectedId} />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
