import { create } from "zustand";
import type {
  ChatMessage,
  GenerationOperation,
  Session,
} from "@/types/generate";
import { persistToStorage } from "./persistence";
import type { PersistedState } from "./persistence";
import {
  applyError,
  applySuccess,
  buildAssistantMessage,
  callApiStream,
  type StreamCallbacks,
} from "./apiClient";
import { createSession } from "./factories";
import { generateId } from "./ids";

function createOperation(): GenerationOperation {
  return {
    requestId: generateId("request"),
    status: "connecting",
    parts: {},
    characterCount: 0,
    estimatedTokens: 0,
  };
}

function updateSessionMessages(
  sessions: Session[],
  sessionId: string,
  updater: (messages: ChatMessage[]) => ChatMessage[],
): Session[] {
  return sessions.map((session) =>
    session.id === sessionId ? { ...session, messages: updater(session.messages) } : session
  );
}

function isGenerating(operation: GenerationOperation | undefined): boolean {
  return operation?.status === "connecting"
    || operation?.status === "generating"
    || operation?.status === "composing";
}

interface StoreState {
  sessions: Session[];
  activeSessionId: string | null;
  prompt: string;
  duration: number;
  operations: Record<string, GenerationOperation>;
  hasHydrated: boolean;
  setPrompt: (prompt: string) => void;
  setDuration: (duration: number) => void;
  setActiveSessionId: (id: string | null) => void;
  submitInitialPrompt: (prompt: string) => string;
  retryPrompt: (sessionId: string) => Promise<void>;
  deleteSession: (id: string) => void;
  hydrate: (persisted: Partial<PersistedState>) => void;
  finishHydration: () => void;
}

export const useStore = create<StoreState>((set, get) => {
  const updateOperation = (
    sessionId: string,
    updater: (operation: GenerationOperation) => GenerationOperation,
  ) => set((state) => {
    const current = state.operations[sessionId];
    if (!current) return state;
    return { operations: { ...state.operations, [sessionId]: updater(current) } };
  });

  const callbacksFor = (sessionId: string): StreamCallbacks => ({
    onStarted: (requestId) => updateOperation(sessionId, (operation) => ({
      ...operation,
      requestId: requestId || operation.requestId,
      status: "generating",
    })),
    onPhase: (phase) => updateOperation(sessionId, (operation) => ({
      ...operation,
      status: phase === "composing"
        ? "composing"
        : phase === "planning"
          ? "planning"
          : "generating",
    })),
    onPlan: (plan) => updateOperation(sessionId, (operation) => {
      const parts = { ...operation.parts };
      if (parts.plan) parts.plan = { ...parts.plan, label: "Plan" };
      for (const scene of plan.scenes) {
        parts[scene.id] = parts[scene.id]
          ? { ...parts[scene.id], label: scene.name }
          : { status: "waiting", characterCount: 0, estimatedTokens: 0, label: scene.name };
      }
      return { ...operation, parts };
    }),
    onProgress: ({ part, characterCount, estimatedTokens, completionTokens }) => {
      updateOperation(sessionId, (operation) => {
        const parts = {
          ...operation.parts,
          [part]: {
            ...operation.parts[part],
            status: "streaming" as const,
            characterCount,
            estimatedTokens,
            ...(completionTokens === undefined ? {} : { completionTokens }),
          },
        };
        const values = Object.values(parts);
        return {
          ...operation,
          status: "generating",
          parts,
          characterCount: values.reduce((total, value) => total + value.characterCount, 0),
          estimatedTokens: values.reduce((total, value) => total + value.estimatedTokens, 0),
          completionTokens: values.some((value) => value.completionTokens !== undefined)
            ? values.reduce((total, value) => total + (value.completionTokens ?? 0), 0)
            : undefined,
        };
      });
    },
    onPartComplete: (part, completionTokens) => updateOperation(sessionId, (operation) => ({
      ...operation,
      parts: {
        ...operation.parts,
        [part]: {
          ...operation.parts[part],
          status: "complete",
          ...(completionTokens === undefined ? {} : { completionTokens }),
        },
      },
    })),
    onDone: (data) => {
      applySuccess(
        set,
        sessionId,
        buildAssistantMessage(data, "Project generated successfully."),
        data,
      );
      updateOperation(sessionId, (operation) => ({ ...operation, status: "succeeded" }));
    },
    onError: (message) => {
      applyError(set, sessionId, message);
      updateOperation(sessionId, (operation) => ({ ...operation, status: "failed", error: message }));
    },
  });

  const startGeneration = (sessionId: string, prompt: string, duration: number) => {
    set((state) => ({
      operations: { ...state.operations, [sessionId]: createOperation() },
    }));
    void callApiStream(
      "/api/generate",
      { prompt, duration },
      callbacksFor(sessionId),
    );
  };

  return {
    sessions: [],
    activeSessionId: null,
    prompt: "",
    duration: 5,
    operations: {},
    hasHydrated: false,
    setPrompt: (prompt) => set({ prompt }),
    setDuration: (duration) => set({ duration }),
    setActiveSessionId: (activeSessionId) => set({ activeSessionId }),

    submitInitialPrompt: (prompt) => {
      const { duration } = get();
      const { session, sessionId } = createSession(prompt, duration);
      set((state) => ({
        sessions: [session, ...state.sessions],
        activeSessionId: sessionId,
      }));
      startGeneration(sessionId, prompt, duration);
      return sessionId;
    },

    retryPrompt: async (sessionId) => {
      const state = get();
      const session = state.sessions.find((candidate) => candidate.id === sessionId);
      if (!session || session.messages.length < 2 || isGenerating(state.operations[sessionId])) return;
      const lastMessage = session.messages.at(-1);
      const userMessage = session.messages.at(-2);
      if (!lastMessage?.isError || userMessage?.role !== "user") return;

      set((current) => ({
        sessions: updateSessionMessages(
          current.sessions,
          sessionId,
          (messages) => messages.slice(0, -1),
        ),
      }));
      startGeneration(sessionId, userMessage.content, session.duration);
    },

    deleteSession: (id) => set((state) => {
      const operations = { ...state.operations };
      delete operations[id];
      return {
        sessions: state.sessions.filter((session) => session.id !== id),
        activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
        operations,
      };
    }),

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
        hasHydrated: true,
      };
    }),
    finishHydration: () => set({ hasHydrated: true }),
  };
});

useStore.subscribe((state) => {
  persistToStorage({
    sessions: state.sessions,
    activeSessionId: state.activeSessionId,
    duration: state.duration,
  });
});
