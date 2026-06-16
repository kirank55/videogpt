import { create } from "zustand";
import type { ChatMessage, Session } from "@/types/generate";
import { initialSessions } from "./demoData";

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

  // Setters
  setPrompt: (prompt: string) => void;
  setDuration: (duration: number) => void;
  setStylePreset: (preset: string) => void;
  clearError: () => void;
  setActiveSessionId: (id: string | null) => void;

  // Actions
  submitInitialPrompt: (prompt: string) => Promise<void>;
  submitModifyPrompt: (sessionId: string, prompt: string) => Promise<void>;
  deleteSession: (id: string) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  sessions: initialSessions,
  activeSessionId: null,
  prompt: "",
  duration: 5,
  stylePreset: "modern",
  error: null,
  isLoading: false,

  setPrompt: (prompt) => set({ prompt }),
  setDuration: (duration) => set({ duration }),
  setStylePreset: (stylePreset) => set({ stylePreset }),
  clearError: () => set({ error: null }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          duration: get().duration,
          stylePreset: get().stylePreset,
        }),
      });

      console.timeEnd("api/generate");
      console.log("← HTTP", res.status, res.statusText);

      if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
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
        content: `Failed to generate project: ${message}. Please try again later.`,
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          prompt,
          brief: session?.brief,
        }),
      });

      if (!res.ok) {
        throw new Error(`API Error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      const assistantMsg: ChatMessage = {
        id: generateId("msg"),
        role: "assistant",
        content: data.summary || "Project modified successfully.",
        project: data.project,
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
        content: `Failed to modify project: ${message}. Please try again later.`,
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

  deleteSession: (id) => {
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== id),
      activeSessionId: state.activeSessionId === id ? null : state.activeSessionId,
    }));
  },
}));
