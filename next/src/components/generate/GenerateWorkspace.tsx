"use client";

import { ChatThread } from "@/components/generate/ChatThread";
import { PromptForm } from "@/components/generate/PromptForm";
import { TopBar } from "@/components/layout/TopBar";
import { useRouter } from "next/navigation";
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
    <>
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
      <main className="mt-6 flex flex-1 flex-col">
        <ChatThread messages={messages} />
        <PromptForm
          prompt={prompt}
          setPrompt={setPrompt}
          duration={duration}
          onChangeDuration={setDuration}
          isLoading={isLoading}
          onSubmit={handleSubmit}
        />
      </main>
    </>
  );
}
