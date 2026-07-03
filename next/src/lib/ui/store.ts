import { create } from "zustand";
import type { ChatMessage, Session, VisualCheckResult } from "@/types/generate";
import { persistToStorage } from "./persistence";
import type { PersistedState } from "./persistence";
import { callApi, callApiStream, buildAssistantMessage, applySuccess, applyError } from "./apiClient";
import type { StreamCallbacks } from "./apiClient";
import { createSession, createUserMessage } from "./factories";

// ── Private helpers ───────────────────────────────────────────────────────────

/** Immutably update messages for a single session. */
function updateSessionMessages(
  sessions: Session[],
  sessionId: string,
  updater: (messages: ChatMessage[]) => ChatMessage[],
): Session[] {
  return sessions.map((s) =>
    s.id === sessionId ? { ...s, messages: updater(s.messages) } : s,
  );
}

// ── Store interface ───────────────────────────────────────────────────────────

interface StoreState {
  sessions: Session[];
  activeSessionId: string | null;
  prompt: string;
  duration: number;
  stylePreset: string;
  error: string | null;
  isLoading: boolean;
  /** Live token count while an LLM stream is in progress. */
  streamingTokenCount: number;
  /** Live character count while an LLM stream is in progress. */
  streamingCharCount: number;

  // Setters
  setPrompt: (prompt: string) => void;
  setDuration: (duration: number) => void;
  setStylePreset: (preset: string) => void;
  clearError: () => void;
  setActiveSessionId: (id: string | null) => void;

  // Actions
  submitInitialPrompt: (prompt: string) => Promise<void>;
  submitModifyPrompt: (sessionId: string, prompt: string) => Promise<void>;
  retryPrompt: (sessionId: string) => Promise<void>;
  deleteSession: (id: string) => void;
  runVisualCheck: (
    sessionId: string,
    messageId: string,
    frames: Array<{ actIndex: number; timestamp: number; dataUrl: string }>
  ) => Promise<void>;
  /** Called once on mount by HydrateStore to restore persisted state. */
  hydrate: (persisted: Partial<PersistedState>) => void;
}

// ── Store factory ─────────────────────────────────────────────────────────────

export const useStore = create<StoreState>((set, get) => {
  // ── Internal streaming helpers (shared by submitInitialPrompt & submitModifyPrompt) ──

  const startStreamingUI = () =>
    set({ isLoading: true, error: null, streamingTokenCount: 0, streamingCharCount: 0 });

  const makeStreamCallbacks = (sessionId: string, successMessage: string): StreamCallbacks => ({
    onChunk: (tokenCount, charCount) => {
      set({ streamingTokenCount: tokenCount, streamingCharCount: charCount });
    },
    onDone: (data) => {
      set({ streamingTokenCount: 0, streamingCharCount: 0 });
      applySuccess(set, sessionId, buildAssistantMessage(data, successMessage), data);
    },
    onError: (message) => {
      set({ streamingTokenCount: 0, streamingCharCount: 0 });
      applyError(set, sessionId, message);
    },
  });

  /** Update a single message within a session by messageId. */
  const updateMessage = (
    sessionId: string,
    messageId: string,
    updater: (msg: ChatMessage) => ChatMessage,
  ) => {
    set((state) => ({
      sessions: updateSessionMessages(state.sessions, sessionId, (msgs) =>
        msgs.map((m) => (m.id === messageId ? updater(m) : m)),
      ),
    }));
  };

  return {
    sessions: [],
    activeSessionId: null,
    prompt: "",
    duration: 5,
    stylePreset: "modern",
    error: null,
    isLoading: false,
    streamingTokenCount: 0,
    streamingCharCount: 0,

    setPrompt: (prompt) => set({ prompt }),
    setDuration: (duration) => set({ duration }),
    setStylePreset: (stylePreset) => set({ stylePreset }),
    clearError: () => set({ error: null }),
    setActiveSessionId: (activeSessionId) => set({ activeSessionId }),

    submitInitialPrompt: async (prompt) => {
      const { duration, stylePreset } = get();
      startStreamingUI();

      const { session: newSession, sessionId } = createSession(prompt);
      set((state) => ({
        sessions: [newSession, ...state.sessions],
        activeSessionId: sessionId,
      }));

      await callApiStream(
        "/api/generate",
        { prompt, duration, stylePreset },
        makeStreamCallbacks(sessionId, "Project generated successfully."),
      );
    },

    submitModifyPrompt: async (sessionId, prompt) => {
      startStreamingUI();

      const userMsg = createUserMessage(prompt);
      set((state) => ({
        sessions: updateSessionMessages(state.sessions, sessionId, (msgs) => [...msgs, userMsg]),
      }));

      const session = get().sessions.find((s) => s.id === sessionId);
      await callApiStream(
        "/api/modify",
        { sessionId, prompt, brief: session?.brief },
        makeStreamCallbacks(sessionId, "Project modified successfully."),
      );
    },

    retryPrompt: async (sessionId) => {
      const { duration, stylePreset } = get();
      const session = get().sessions.find((s) => s.id === sessionId);
      if (!session) return;

      const { messages } = session;
      if (messages.length < 2) return;

      const lastMsg = messages[messages.length - 1];
      if (!lastMsg.isError) return;

      const userMsg = messages[messages.length - 2];
      if (userMsg.role !== "user") return;

      const userPrompt = userMsg.content;

      // Remove the error message, then retry
      set((state) => ({
        sessions: updateSessionMessages(state.sessions, sessionId, (msgs) => msgs.slice(0, -1)),
        isLoading: true,
        error: null,
      }));

      try {
        const data = session.brief
          ? await callApi("/api/modify", { sessionId, prompt: userPrompt, brief: session.brief })
          : await callApi("/api/generate", { prompt: userPrompt, duration, stylePreset });

        const fallback = session.brief ? "Project modified successfully." : "Project generated successfully.";
        applySuccess(set, sessionId, buildAssistantMessage(data, fallback), data);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        applyError(set, sessionId, message);
      }
    },

    deleteSession: (id) => {
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== id),
        activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
      }));
    },

    runVisualCheck: async (sessionId, messageId, frames) => {
      updateMessage(sessionId, messageId, (m) => ({ ...m, visualCheckLoading: true }));

      try {
        const session = get().sessions.find((s) => s.id === sessionId);
        const prompt = session?.project?.name || "Untitled";

        const res = await fetch("/api/visual-check", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ prompt, frames }),
        });

        if (!res.ok) {
          throw new Error(`Visual check failed with HTTP ${res.status}`);
        }

        const visualCheck = await res.json();
        updateMessage(sessionId, messageId, (m) => ({
          ...m,
          visualCheck,
          visualCheckLoading: false,
        }));
      } catch (err) {
        console.error("[store] Visual check failed:", err);
        updateMessage(sessionId, messageId, (m) => ({
          ...m,
          visualCheckLoading: false,
          visualCheck: {
            score: 0,
            passed: false,
            summary: `Visual check error: ${err instanceof Error ? err.message : String(err)}`,
            frames: [],
            recommendations: ["Ensure API key is valid and network connectivity is active."],
          },
        }));
      }
    },

    hydrate: (persisted) => {
      set((state) => {
        // Persisted sessions take priority; state.sessions fill in any gaps
        const sessionMap = new Map(
          [...(persisted.sessions ?? []), ...state.sessions].map((s) => [s.id, s]),
        );

        return {
          sessions: [...sessionMap.values()],
          activeSessionId: persisted.activeSessionId ?? state.activeSessionId,
          duration: persisted.duration ?? state.duration,
          stylePreset: persisted.stylePreset ?? state.stylePreset,
        };
      });
    },
  };
});

// ── Auto-persist after every state change ────────────────────────────────────
// Subscribe outside the store factory so we have access to the created store.
// Only the serialisable slice is written; functions and transient flags are
// intentionally excluded.
useStore.subscribe((state) => {
  persistToStorage({
    sessions: state.sessions,
    activeSessionId: state.activeSessionId,
    duration: state.duration,
    stylePreset: state.stylePreset,
  });
});
