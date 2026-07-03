"use client";

import { useCallback, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { ChatThread, defaultMessages as defaultWelcomeMessages } from "@/components/generate/ChatThread";
import { PromptForm } from "@/components/generate/PromptForm";
import { TopBar } from "@/components/layout/TopBar";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/ui/store";
import { NoPreview } from "@/components/home/NoPreview";

export default function GeneratePage() {
  const router = useRouter();

  const {
    activeSessionId,
    sessions,
    isLoading,
    prompt,
    setPrompt,
    duration,
    setDuration,
    submitInitialPrompt,
    submitModifyPrompt,
    setActiveSessionId,
  } = useStore(
    useShallow((s) => ({
      activeSessionId: s.activeSessionId,
      sessions: s.sessions,
      isLoading: s.isLoading,
      prompt: s.prompt,
      setPrompt: s.setPrompt,
      duration: s.duration,
      setDuration: s.setDuration,
      submitInitialPrompt: s.submitInitialPrompt,
      submitModifyPrompt: s.submitModifyPrompt,
      setActiveSessionId: s.setActiveSessionId,
    }))
  );

  const handleNewProject = useCallback(() => {
    setActiveSessionId(null);
    router.push("/generate");
  }, [setActiveSessionId, router]);

  const activeSession = useMemo(() => {
    return activeSessionId ? sessions.find((s) => s.id === activeSessionId) : undefined;
  }, [sessions, activeSessionId]);

  const messages = useMemo(() => {
    return activeSession ? activeSession.messages : defaultWelcomeMessages;
  }, [activeSession]);

  const handleSubmit = useCallback(
    (promptVal: string) => {
      // If no session is active, create a new session
      if (!activeSessionId) submitInitialPrompt(promptVal);
      else submitModifyPrompt(activeSessionId, promptVal);
    },
    [activeSessionId, submitInitialPrompt, submitModifyPrompt]
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden h-full">
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-6 pb-4">
        <TopBar
          title="Generate"
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
        {activeSession ? <ChatThread messages={messages} /> : <NoPreview />}
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
          minLength={activeSession ? undefined : 20}
        />
      </div>
    </div>
  );
}

