"use client";

import { ChatThread, defaultMessages as defaultWelcomeMessages } from "@/components/generate/ChatThread";
import { PromptForm } from "@/components/generate/PromptForm";
import { TopBar } from "@/components/layout/TopBar";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/ui/store";
import type { ChatMessage } from "@/types/generate";

type GenerateWorkspaceProps = {
  initialMessages?: ChatMessage[];
  title?: string;
  ignoreActiveSession?: boolean;
};

export function GenerateWorkspace({
  initialMessages: initialMessagesProp = defaultWelcomeMessages,
  title = "Generate",
  ignoreActiveSession = false,
}: GenerateWorkspaceProps) {
  const activeSessionId = useStore((s) => s.activeSessionId);
  const sessions = useStore((s) => s.sessions);
  const isLoading = useStore((s) => s.isLoading);
  const prompt = useStore((s) => s.prompt);
  const setPrompt = useStore((s) => s.setPrompt);
  const duration = useStore((s) => s.duration);
  const setDuration = useStore((s) => s.setDuration);
  const submitInitialPrompt = useStore((s) => s.submitInitialPrompt);
  const submitModifyPrompt = useStore((s) => s.submitModifyPrompt);
  const setActiveSessionId = useStore((s) => s.setActiveSessionId);
  const router = useRouter();

  const handleNewProject = () => {
    setActiveSessionId(null);
    router.push("/generate");
  };

  const activeSession = !ignoreActiveSession && activeSessionId
    ? sessions.find((s) => s.id === activeSessionId)
    : undefined;
  const messages = activeSession ? activeSession.messages : initialMessagesProp;

  const handleSubmit = (promptVal: string) => {
    if (activeSession && activeSessionId) {
      submitModifyPrompt(activeSessionId, promptVal);
    } else {
      submitInitialPrompt(promptVal);
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden h-full">
      {/* Scrollable area containing TopBar and ChatThread */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-6 pb-4">
        <TopBar
          title={title}
          actions={
            <button
              type="button"
              onClick={handleNewProject}
              className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-all duration-150 hover:opacity-90 active:scale-95 cursor-pointer shadow-sm"
            >
              New Project
            </button>
          }
        />
        <ChatThread messages={messages} />
      </div>

      {/* Input area fixed at bottom */}
      <div className="shrink-0 pt-2">
        <PromptForm
          prompt={prompt}
          setPrompt={setPrompt}
          duration={duration}
          onChangeDuration={setDuration}
          isLoading={isLoading}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
