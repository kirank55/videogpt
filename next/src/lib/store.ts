import { create } from "zustand";
import type { ChatMessage, Session } from "@/types/generate";
import { initialSessions } from "./demoData";
import { persistToStorage } from "./persistence";
import type { PersistedState } from "./persistence";

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
    set({ isLoading: true, error: null });
    const sessionId = generateId("session");
    const userMsg: ChatMessage = {
      id: generateId("msg"),
      role: "user",
      content: prompt,
    };

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

    console.log("→ POST /api/generate …");
    console.time("api/generate");
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(get().customApiKey ? { "Authorization": `Bearer ${get().customApiKey}` } : {}),
        },
        body: JSON.stringify({
          prompt,
          duration: get().duration,
          stylePreset: get().stylePreset,
        }),
      });

      console.timeEnd("api/generate");
      console.log("← HTTP", res.status, res.statusText);

      if (!res.ok) {
        let errMsg = `API Error: ${res.status} ${res.statusText}`;
        try {
          const errData = await res.json();
          if (errData.summary) errMsg = errData.summary;
          else if (errData.error) errMsg = errData.error;
        } catch {
          // ignore
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      console.log("data.brief:", data.brief);
      console.log("data.diagnostics:", data.diagnostics);
      console.log("events:", data.project?.events?.length, "total");
      if (data.diagnostics?.llmError) {
        console.warn("LLM error:", data.diagnostics.llmError);
      }

      const assistantMsg: ChatMessage = {
        id: generateId("msg"),
        role: "assistant",
        content: data.summary || "Project generated successfully.",
        project: data.project,
        brief: data.brief,
        diagnostics: data.diagnostics?.qualityResult,
        rawBrief: data.diagnostics?.rawBrief,
      };

      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId
            ? {
              ...s,
              messages: [...s.messages, assistantMsg],
              project: data.project,
              brief: data.brief,
            }
            : s
        ),
        isLoading: false,
      }));
      console.log("✅ done");
    } catch (err) {
      console.timeEnd("api/generate");
      const message = err instanceof Error ? err.message : String(err);
      console.error("❌ error:", message);
      const errorMsg: ChatMessage = {
        id: generateId("msg-err"),
        role: "assistant",
        content: message,
        isError: true,
      };
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, messages: [...s.messages, errorMsg] } : s
        ),
        error: message,
        isLoading: false,
      }));
    }
    console.groupEnd();
  },

  submitModifyPrompt: async (sessionId, prompt) => {
    set({ isLoading: true, error: null });
    const userMsg: ChatMessage = {
      id: generateId("msg"),
      role: "user",
      content: prompt,
    };

    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === sessionId ? { ...s, messages: [...s.messages, userMsg] } : s
      ),
    }));

    try {
      const session = get().sessions.find((s) => s.id === sessionId);
      const res = await fetch("/api/modify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(get().customApiKey ? { "Authorization": `Bearer ${get().customApiKey}` } : {}),
        },
        body: JSON.stringify({
          sessionId,
          prompt,
          brief: session?.brief,
        }),
      });

      if (!res.ok) {
        let errMsg = `API Error: ${res.status} ${res.statusText}`;
        try {
          const errData = await res.json();
          if (errData.summary) errMsg = errData.summary;
          else if (errData.error) errMsg = errData.error;
        } catch {
          // ignore
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: generateId("msg"),
        role: "assistant",
        content: data.summary || "Project modified successfully.",
        project: data.project,
        brief: data.brief,
        diagnostics: data.diagnostics?.qualityResult,
        rawBrief: data.diagnostics?.rawBrief,
      };

      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId
            ? {
              ...s,
              messages: [...s.messages, assistantMsg],
              project: data.project,
              brief: data.brief,
            }
            : s
        ),
        isLoading: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const errorMsg: ChatMessage = {
        id: generateId("msg-err"),
        role: "assistant",
        content: message,
        isError: true,
      };
      set((state) => ({
        sessions: state.sessions.map((s) =>
          s.id === sessionId ? { ...s, messages: [...s.messages, errorMsg] } : s
        ),
        error: message,
        isLoading: false,
      }));
    }
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
        s.id === sessionId ? { ...s, messages: cleanMessages } : s
      ),
      isLoading: true,
      error: null,
    }));

    if (session.brief) {
      // Re-run modify flow
      try {
        const res = await fetch("/api/modify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(get().customApiKey ? { "Authorization": `Bearer ${get().customApiKey}` } : {}),
          },
          body: JSON.stringify({
            sessionId,
            prompt: userPrompt,
            brief: session.brief,
          }),
        });

        if (!res.ok) {
          let errMsg = `API Error: ${res.status} ${res.statusText}`;
          try {
            const errData = await res.json();
            if (errData.summary) errMsg = errData.summary;
            else if (errData.error) errMsg = errData.error;
          } catch {
            // ignore
          }
          throw new Error(errMsg);
        }

        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: generateId("msg"),
          role: "assistant",
          content: data.summary || "Project modified successfully.",
          project: data.project,
          brief: data.brief,
          diagnostics: data.diagnostics?.qualityResult,
          rawBrief: data.diagnostics?.rawBrief,
        };

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                ...s,
                messages: [...s.messages, assistantMsg],
                project: data.project,
                brief: data.brief,
              }
              : s
          ),
          isLoading: false,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const errorMsg: ChatMessage = {
          id: generateId("msg-err"),
          role: "assistant",
          content: message,
          isError: true,
        };
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, messages: [...s.messages, errorMsg] } : s
          ),
          error: message,
          isLoading: false,
        }));
      }
    } else {
      // Re-run initial generate flow
      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(get().customApiKey ? { "Authorization": `Bearer ${get().customApiKey}` } : {}),
          },
          body: JSON.stringify({
            prompt: userPrompt,
            duration: get().duration,
            stylePreset: get().stylePreset,
          }),
        });

        if (!res.ok) {
          let errMsg = `API Error: ${res.status} ${res.statusText}`;
          try {
            const errData = await res.json();
            if (errData.summary) errMsg = errData.summary;
            else if (errData.error) errMsg = errData.error;
          } catch {
            // ignore
          }
          throw new Error(errMsg);
        }

        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: generateId("msg"),
          role: "assistant",
          content: data.summary || "Project generated successfully.",
          project: data.project,
          brief: data.brief,
          diagnostics: data.diagnostics?.qualityResult,
          rawBrief: data.diagnostics?.rawBrief,
        };

        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId
              ? {
                ...s,
                messages: [...s.messages, assistantMsg],
                project: data.project,
                brief: data.brief,
              }
              : s
          ),
          isLoading: false,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const errorMsg: ChatMessage = {
          id: generateId("msg-err"),
          role: "assistant",
          content: message,
          isError: true,
        };
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, messages: [...s.messages, errorMsg] } : s
          ),
          error: message,
          isLoading: false,
        }));
      }
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
