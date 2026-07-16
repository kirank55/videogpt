import { create } from "zustand";
import type { ChatMessage, Session } from "@/types/generate";
import { persistToStorage } from "./persistence";
import type { PersistedState } from "./persistence";
import {
  applyError,
  applySuccess,
  buildAssistantMessage,
  callApi,
  callApiStream,
  type StreamCallbacks,
} from "./apiClient";
import { createSession } from "./factories";

function updateSessionMessages(
  sessions: Session[],
  sessionId: string,
  updater: (messages: ChatMessage[]) => ChatMessage[],
): Session[] {
  return sessions.map((session) =>
    session.id === sessionId ? { ...session, messages: updater(session.messages) } : session
  );
}

interface StoreState {
  sessions: Session[];
  activeSessionId: string | null;
  prompt: string;
  duration: number;
  error: string | null;
  isLoading: boolean;
  streamingTokenCount: number;
  streamingCharCount: number;
  loadingPhase: string | null;
  setPrompt: (prompt: string) => void;
  setDuration: (duration: number) => void;
  clearError: () => void;
  setActiveSessionId: (id: string | null) => void;
  submitInitialPrompt: (prompt: string) => Promise<void>;
  retryPrompt: (sessionId: string) => Promise<void>;
  deleteSession: (id: string) => void;
  hydrate: (persisted: Partial<PersistedState>) => void;
}

export const useStore = create<StoreState>((set, get) => {
  const finishStreaming = () => set({
    streamingTokenCount: 0,
    streamingCharCount: 0,
    loadingPhase: null,
  });

  const callbacksFor = (sessionId: string): StreamCallbacks => ({
    onPhase: (phase) => set({ loadingPhase: phase }),
    onChunk: (tokenCount, charCount) => set({
      streamingTokenCount: tokenCount,
      streamingCharCount: charCount,
    }),
    onDone: (data) => {
      finishStreaming();
      applySuccess(
        set,
        sessionId,
        buildAssistantMessage(data, "Project generated successfully."),
        data,
      );
    },
    onError: (message) => {
      finishStreaming();
      applyError(set, sessionId, message);
    },
  });

  return {
    sessions: [],
    activeSessionId: null,
    prompt: "",
    duration: 5,
    error: null,
    isLoading: false,
    streamingTokenCount: 0,
    streamingCharCount: 0,
    loadingPhase: null,
    setPrompt: (prompt) => set({ prompt }),
    setDuration: (duration) => set({ duration }),
    clearError: () => set({ error: null }),
    setActiveSessionId: (activeSessionId) => set({ activeSessionId }),

    submitInitialPrompt: async (prompt) => {
      const { duration } = get();
      set({
        isLoading: true,
        error: null,
        streamingTokenCount: 0,
        streamingCharCount: 0,
        loadingPhase: null,
      });
      const { session, sessionId } = createSession(prompt, duration);
      set((state) => ({
        sessions: [session, ...state.sessions],
        activeSessionId: sessionId,
      }));
      await callApiStream(
        "/api/generate",
        { prompt, duration },
        callbacksFor(sessionId),
      );
    },

    retryPrompt: async (sessionId) => {
      const session = get().sessions.find((candidate) => candidate.id === sessionId);
      if (!session || session.messages.length < 2) return;
      const lastMessage = session.messages.at(-1);
      const userMessage = session.messages.at(-2);
      if (!lastMessage?.isError || userMessage?.role !== "user") return;

      set((state) => ({
        sessions: updateSessionMessages(
          state.sessions,
          sessionId,
          (messages) => messages.slice(0, -1),
        ),
        isLoading: true,
        error: null,
        loadingPhase: null,
      }));
      try {
        const data = await callApi("/api/generate", {
          prompt: userMessage.content,
          duration: session.duration,
        });
        applySuccess(
          set,
          sessionId,
          buildAssistantMessage(data, "Project generated successfully."),
          data,
        );
      } catch (error) {
        applyError(
          set,
          sessionId,
          error instanceof Error ? error.message : String(error),
        );
      }
    },

    deleteSession: (id) => set((state) => ({
      sessions: state.sessions.filter((session) => session.id !== id),
      activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
    })),

    hydrate: (persisted) => set((state) => {
      const sanitizedSessions: Session[] = (persisted.sessions ?? []).map((session) => ({
        id: session.id,
        name: session.name,
        duration: session.duration ?? persisted.duration ?? state.duration,
        project: session.project,
        updatedAt: session.updatedAt,
        messages: session.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          project: message.project,
          isError: message.isError,
          createdAt: message.createdAt,
        })),
      }));
      const sessionMap = new Map(
        [...sanitizedSessions, ...state.sessions].map((session) => [session.id, session]),
      );
      return {
        sessions: [...sessionMap.values()],
        activeSessionId: persisted.activeSessionId ?? state.activeSessionId,
        duration: persisted.duration ?? state.duration,
      };
    }),
  };
});

useStore.subscribe((state) => {
  persistToStorage({
    sessions: state.sessions,
    activeSessionId: state.activeSessionId,
    duration: state.duration,
  });
});
