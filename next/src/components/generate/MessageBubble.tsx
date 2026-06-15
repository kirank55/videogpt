import type { ReactNode } from "react";
import { PlayerCard } from "@/components/player";
import type { VideoProject } from "@/lib/renderer";

type MessageBubbleProps = {
  role: "user" | "assistant";
  children: ReactNode;
  project?: VideoProject;
};

export function MessageBubble({ role, children, project }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[85%]">
        <div
          className={`rounded-3xl px-5 py-4 text-sm leading-7 shadow-sm
           ${
             isUser
               ? "bg-primary text-primary-foreground"
               : "bg-surface-raised text-foreground ring-1 ring-border"
           }`}
        >
          {children}
        </div>
        {project ? (
          <div className="mt-3 max-w-xl w-full">
            <PlayerCard project={project} showControls />
          </div>
        ) : null}
      </div>
    </div>
  );
}
