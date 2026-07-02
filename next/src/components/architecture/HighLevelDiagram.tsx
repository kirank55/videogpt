"use client";

import { PIPELINE_STAGES } from "@/lib/others/architecture/stages";

interface HighLevelDiagramProps {
  onSelect: (stageId: string) => void;
  selectedId?: string | null;
}

export function HighLevelDiagram({ onSelect, selectedId }: HighLevelDiagramProps) {
  return (
    <div className="flex items-stretch gap-0 py-2 overflow-x-auto">
      {PIPELINE_STAGES.map((stage, i) => {
        const isLast = i === PIPELINE_STAGES.length - 1;
        const isSelected = selectedId === stage.id;

        return (
          <div key={stage.id} className="flex items-stretch shrink-0">
            <button
              type="button"
              onClick={() => onSelect(stage.id)}
              className={`group flex w-[140px] flex-col justify-center rounded-lg border px-3 py-2.5 text-center transition-all cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-md ring-1 ring-primary/30"
                  : "border-border bg-surface hover:border-foreground/40 hover:bg-foreground/[0.04] shadow-sm"
              }`}
            >
              <span
                className={`text-[10px] font-bold tabular-nums ${
                  isSelected ? "text-primary" : "text-muted-foreground/70"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={`mt-0.5 text-xs font-bold leading-tight tracking-tight ${
                  isSelected ? "text-primary" : "text-foreground"
                }`}
              >
                {stage.label}
              </span>
              <span className="mt-1 text-[10px] leading-tight text-muted-foreground line-clamp-2">
                {stage.summary}
              </span>
            </button>

            {!isLast && (
              <div className="flex items-center px-1.5" aria-hidden>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  className="size-4 shrink-0 text-muted-foreground/50"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-4-4l4 4-4 4" />
                </svg>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
