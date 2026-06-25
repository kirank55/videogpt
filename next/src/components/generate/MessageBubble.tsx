import type { ReactNode } from "react";
import { PlayerCard } from "@/components/player";
import type { VideoProject } from "@/lib/renderer";
import type { QualityResult } from "@/lib/renderer";

type MessageBubbleProps = {
  role: "user" | "assistant";
  children: ReactNode;
  project?: VideoProject;
  diagnostics?: QualityResult;
  sessionId?: string;
  messageId?: string;
  isError?: boolean;
  onRetry?: () => void;
  isLoading?: boolean;
};

export function MessageBubble({
  role,
  children,
  project,
  diagnostics,
  sessionId,
  messageId,
  isError,
  onRetry,
  isLoading = false,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={project || isLoading ? "w-full max-w-xl" : "max-w-[85%]"}>
        <div
          className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed border transition-all duration-200
            ${
              isUser
                ? "bg-primary text-primary-foreground font-medium border-transparent rounded-tr-none shadow-sm"
                : isError
                ? "bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400 rounded-tl-none shadow-sm"
                : "bg-surface-raised text-foreground border-border/80 rounded-tl-none shadow-sm"
            }`}
        >
          {isError ? (
            <div className="flex items-start gap-3">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0 mt-0.5"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              <div className="flex-1">
                <span className="font-semibold block mb-0.5 text-rose-800 dark:text-rose-300">
                  Generation Failed
                </span>
                <p className="opacity-90">{children}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="flex items-center gap-1.5 mt-3 px-3 py-1.5 text-xs font-semibold border border-border bg-background hover:bg-muted text-foreground rounded-lg transition-all active:scale-[0.97] cursor-pointer shadow-xs select-none"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-3.5 h-3.5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                      />
                    </svg>
                    Retry Prompt
                  </button>
                )}
              </div>
            </div>
          ) : (
            children
          )}
        </div>
        {project || isLoading ? (
          <div className="w-full max-w-xl">
            {project && (
              <div
                id={`edit-toolbar-portal-${project.id}`}
                className="relative w-full flex justify-center overflow-visible"
              />
            )}
            <div className="mt-3 w-full">
              <PlayerCard
                project={project}
                isLoading={isLoading}
                showControls={!isLoading}
                sessionId={sessionId}
                messageId={messageId}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
