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
      if (!activeSessionId) submitInitialPrompt(promptVal);
    },
    [activeSessionId, submitInitialPrompt]
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

      {!activeSession ? (
        <div className="shrink-0 pt-2">
          <PromptForm
            prompt={prompt}
            setPrompt={setPrompt}
            duration={duration}
            onChangeDuration={setDuration}
            isLoading={isLoading}
            onSubmit={handleSubmit}
            minLength={20}
          />
        </div>
      ) : !isLoading && activeSession.project ? (
        <div className="shrink-0 pt-3 text-center text-sm text-muted-foreground">
          Create a new project to generate another video.
        </div>
      ) : null}
    </div>
  );
}
