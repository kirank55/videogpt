import { create } from "zustand";
import type { ChatMessage, Session } from "@/types/generate";
import { initialSessions } from "./demoData";
import { persistToStorage } from "./persistence";
import type { PersistedState } from "./persistence";
import { callApi, callApiStream, buildAssistantMessage, applySuccess, applyError } from "./apiClient";

function generateId(prefix: string): string {
  const rand = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${Date.now()}-${rand}`;
}

interface StoreState {
  sessions: Session[];
  activeSessionId: string | null;
  prompt: string;
  duration: number;
  stylePreset: string;
  error: string | null;
  isLoading: boolean;
  theme: "light" | "dark" | "system";
  customApiKey: string;
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
  setTheme: (theme: "light" | "dark" | "system") => void;
  setCustomApiKey: (key: string) => void;

  // Actions
  submitInitialPrompt: (prompt: string) => Promise<void>;
  submitModifyPrompt: (sessionId: string, prompt: string) => Promise<void>;
  retryPrompt: (sessionId: string) => Promise<void>;
  deleteSession: (id: string) => void;
  /** Called once on mount by HydrateStore to restore persisted state. */
  hydrate: (persisted: Partial<PersistedState>) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  sessions: initialSessions,
  activeSessionId: null,
  prompt: "",
  duration: 5,
  stylePreset: "modern",
  error: null,
  isLoading: false,
  theme: "system",
  customApiKey: "",
  streamingTokenCount: 0,
  streamingCharCount: 0,

  setPrompt: (prompt) => set({ prompt }),
  setDuration: (duration) => set({ duration }),
  setStylePreset: (stylePreset) => set({ stylePreset }),
  clearError: () => set({ error: null }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  setTheme: (theme) => set({ theme }),
  setCustomApiKey: (customApiKey) => set({ customApiKey }),

  submitInitialPrompt: async (prompt) => {
    console.group(`[store] submitInitialPrompt`);
    console.log("prompt:", prompt);
    console.log("duration:", get().duration, "style:", get().stylePreset);
    set({ isLoading: true, error: null, streamingTokenCount: 0, streamingCharCount: 0 });

    const sessionId = generateId("session");
    const userMsg: ChatMessage = { id: generateId("msg"), role: "user", content: prompt };
    const newSession: Session = {
      id: sessionId,
      name: prompt.slice(0, 30) || "Untitled Project",
      messages: [userMsg],
      updatedAt: `Edited ${new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`,
    };

    set((state) => ({
      sessions: [newSession, ...state.sessions],
      activeSessionId: sessionId,
    }));

    console.log("→ POST /api/generate/stream …");
    console.time("api/generate/stream");
    await callApiStream(
      "/api/generate",
      { prompt, duration: get().duration, stylePreset: get().stylePreset },
      get().customApiKey,
      {
        onChunk: (tokenCount, charCount) => {
          set({ streamingTokenCount: tokenCount, streamingCharCount: charCount });
        },
        onDone: (data) => {
          console.timeEnd("api/generate/stream");
          set({ streamingTokenCount: 0, streamingCharCount: 0 });
          applySuccess(set, sessionId, buildAssistantMessage(data, "Project generated successfully."), data);
          console.log("✅ done");
        },
        onError: (message) => {
          console.timeEnd("api/generate/stream");
          set({ streamingTokenCount: 0, streamingCharCount: 0 });
          applyError(set, sessionId, message);
          console.error("❌ error:", message);
        },
      },
    );
    console.groupEnd();
  },

  submitModifyPrompt: async (sessionId, prompt) => {
    set({ isLoading: true, error: null, streamingTokenCount: 0, streamingCharCount: 0 });
    const userMsg: ChatMessage = { id: generateId("msg"), role: "user", content: prompt };

    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, messages: [...s.messages, userMsg] } : s,
      ),
    }));

    const session = get().sessions.find((s) => s.id === sessionId);
    await callApiStream(
      "/api/modify",
      { sessionId, prompt, brief: session?.brief },
      get().customApiKey,
      {
        onChunk: (tokenCount, charCount) => {
          set({ streamingTokenCount: tokenCount, streamingCharCount: charCount });
        },
        onDone: (data) => {
          set({ streamingTokenCount: 0, streamingCharCount: 0 });
          applySuccess(set, sessionId, buildAssistantMessage(data, "Project modified successfully."), data);
        },
        onError: (message) => {
          set({ streamingTokenCount: 0, streamingCharCount: 0 });
          applyError(set, sessionId, message);
        },
      },
    );
  },

  retryPrompt: async (sessionId) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    if (!session) return;

    const messages = session.messages;
    if (messages.length < 2) return;

    const lastMsg = messages[messages.length - 1];
    if (!lastMsg.isError) return;

    const userMsg = messages[messages.length - 2];
    if (userMsg.role !== "user") return;

    const userPrompt = userMsg.content;
    const cleanMessages = messages.slice(0, -1);

    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, messages: cleanMessages } : s,
      ),
      isLoading: true,
      error: null,
    }));

    try {
      const data = session.brief
        ? await callApi(
            "/api/modify",
            { sessionId, prompt: userPrompt, brief: session.brief },
            get().customApiKey,
          )
        : await callApi(
            "/api/generate",
            { prompt: userPrompt, duration: get().duration, stylePreset: get().stylePreset },
            get().customApiKey,
          );

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

  hydrate: (persisted) => {
    set((state) => {
      const persistedSessions = persisted.sessions ?? [];
      const mergedSessions = [...persistedSessions];
      for (const initS of state.sessions) {
        if (!mergedSessions.some((s) => s.id === initS.id)) {
          mergedSessions.push(initS);
        }
      }
      let customApiKey = persisted.customApiKey ?? state.customApiKey;
      if (customApiKey === "undefined" || customApiKey === "null") {
        customApiKey = "";
      }
      return {
        sessions: mergedSessions,
        activeSessionId: persisted.activeSessionId ?? state.activeSessionId,
        duration: persisted.duration ?? state.duration,
        stylePreset: persisted.stylePreset ?? state.stylePreset,
        theme: persisted.theme ?? state.theme,
        customApiKey,
      };
    });
  },
}));

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
    theme: state.theme,
    customApiKey: state.customApiKey,
  });
});
