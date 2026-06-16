import type { ReactNode } from "react";
import { PlayerCard } from "@/components/player";
import { QualityPanel } from "@/components/generate/QualityPanel";
import type { VideoProject } from "@/lib/renderer";
import type { QualityResult } from "@/lib/renderer";

type MessageBubbleProps = {
  role: "user" | "assistant";
  children: ReactNode;
  project?: VideoProject;
  diagnostics?: QualityResult;
};

export function MessageBubble({ role, children, project, diagnostics }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%]">
        <div
          className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed
           ${
             isUser
               ? "bg-primary text-primary-foreground font-medium rounded-tr-none shadow-sm"
               : "bg-surface-raised text-foreground border border-border/80 rounded-tl-none shadow-sm"
           }`}
        >
          {children}
        </div>
        {project ? (
          <div className="mt-3 max-w-xl w-full">
            <PlayerCard project={project} showControls />
          </div>
        ) : null}
        {/* Quality panel — shown below canvas when diagnostics present */}
        {diagnostics ? (
          <div className="mt-2 max-w-xl w-full">
            <QualityPanel result={diagnostics} defaultOpen={!diagnostics.passed} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
