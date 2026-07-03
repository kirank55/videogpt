/**
 * src/lib/persistence.ts
 *
 * Thin persistence layer for the Zustand store.
 * Only the user-facing slice (sessions, active session, form defaults) is
 * persisted — transient state (isLoading, error, prompt) is always reset
 * on page load.
 *
 * Storage key is versioned so future schema changes can safely wipe stale data.
 */

import type { Session } from "@/types/generate";

const STORAGE_KEY = "videogpt:store:v1";

// ── Persisted shape ───────────────────────────────────────────────────────────

export type PersistedState = {
  sessions: Session[];
  activeSessionId: string | null;
  duration: number;
  stylePreset: string;
};

// ── Write ─────────────────────────────────────────────────────────────────────

export function persistToStorage(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or private mode — silently ignore
  }
}

// ── Read ──────────────────────────────────────────────────────────────────────

export function hydrateFromStorage(): Partial<PersistedState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    // Basic sanity guard: sessions must be an array
    if (!Array.isArray(parsed.sessions)) return null;
    return parsed;
  } catch {
    return null;
  }
}

// ── Clear ─────────────────────────────────────────────────────────────────────

export function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
