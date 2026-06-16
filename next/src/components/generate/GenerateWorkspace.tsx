"use client";

import { ChatThread } from "@/components/generate/ChatThread";
import { PromptForm } from "@/components/generate/PromptForm";
import { TopBar } from "@/components/layout/TopBar";
import { useStore } from "@/lib/store";
import type { ChatMessage } from "@/types/generate";

const defaultWelcomeMessages: ChatMessage[] = [
  {
    id: "welcome",
    role: "assistant",
    content: "Welcome back. Describe the video beat you want to build and I will sketch the first scene plan.",
  },
];

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
  const submitInitialPrompt = useStore((s) => s.submitInitialPrompt);
  const submitModifyPrompt = useStore((s) => s.submitModifyPrompt);

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
    <>
      <TopBar
        title={title}
        actions={
          <button
            type="button"
            className="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            Prompt Guide
          </button>
        }
      />
      <main className="mt-6 flex flex-1 flex-col">
        <ChatThread messages={messages} />
        <PromptForm
          prompt={prompt}
          setPrompt={setPrompt}
          isLoading={isLoading}
          onSubmit={handleSubmit}
        />
      </main>
    </>
  );
}
