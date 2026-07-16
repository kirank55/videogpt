"use client";

import { useCallback, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useShallow } from "zustand/react/shallow";
import { ChatThread, defaultMessages as defaultWelcomeMessages } from "@/components/generate/ChatThread";
import { PromptForm } from "@/components/generate/PromptForm";
import { TopBar } from "@/components/layout/TopBar";
import { useStore } from "@/lib/ui/store";
import { NoPreview } from "@/components/home/NoPreview";

export function GenerateWorkspace({ projectId }: { projectId?: string }) {
  const router = useRouter();
  const {
    sessions,
    operations,
    hasHydrated,
    prompt,
    setPrompt,
    duration,
    setDuration,
    submitInitialPrompt,
    setActiveSessionId,
  } = useStore(
    useShallow((state) => ({
      sessions: state.sessions,
      operations: state.operations,
      hasHydrated: state.hasHydrated,
      prompt: state.prompt,
      setPrompt: state.setPrompt,
      duration: state.duration,
      setDuration: state.setDuration,
      submitInitialPrompt: state.submitInitialPrompt,
      setActiveSessionId: state.setActiveSessionId,
    })),
  );

  useEffect(() => {
    setActiveSessionId(projectId ?? null);
  }, [projectId, setActiveSessionId]);

  const activeSession = useMemo(
    () => projectId ? sessions.find((session) => session.id === projectId) : undefined,
    [projectId, sessions],
  );
  const operation = projectId ? operations[projectId] : undefined;
  const isLoading = operation?.status === "connecting"
    || operation?.status === "generating"
    || operation?.status === "composing";
  const messages = activeSession?.messages ?? defaultWelcomeMessages;

  const handleNewProject = useCallback(() => {
    router.push("/generate");
  }, [router]);

  const handleSubmit = useCallback((promptValue: string) => {
    const sessionId = submitInitialPrompt(promptValue);
    router.replace(`/generate/${encodeURIComponent(sessionId)}`);
  }, [router, submitInitialPrompt]);

  if (projectId && !hasHydrated && !activeSession) {
    return (
      <div className="flex h-full flex-1 items-center justify-center" role="status" aria-live="polite">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span className="size-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
          Loading project…
        </div>
      </div>
    );
  }

  if (projectId && !activeSession) {
    return (
      <div className="flex h-full flex-1 flex-col">
        <TopBar title="Project not found" />
        <div className="card m-auto max-w-lg p-8 text-center" role="alert">
          <h2 className="text-lg font-semibold text-foreground">This project is not available on this device.</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Project URLs currently point to data stored in this browser.
          </p>
          <button type="button" onClick={handleNewProject} className="mt-5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground">
            Create a new project
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-4 pr-1">
        <TopBar
          title="Generate"
          actions={
            <button
              type="button"
              onClick={handleNewProject}
              className="cursor-pointer rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-all duration-150 hover:opacity-90 active:scale-95"
            >
              New Project
            </button>
          }
        />
        {activeSession ? (
          <ChatThread
            messages={messages}
            sessionId={activeSession.id}
            isLoading={isLoading}
          />
        ) : <NoPreview />}
      </div>

      {!activeSession ? (
        <div className="shrink-0 pt-2">
          <PromptForm
            prompt={prompt}
            setPrompt={setPrompt}
            duration={duration}
            onChangeDuration={setDuration}
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
