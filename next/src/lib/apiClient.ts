// ── API Client ────────────────────────────────────────────────────────────────
//
// Owns the full path from HTTP request → ChatMessage → store update.
//
//   callApi(endpoint, body, apiKey)
//     → fetch → parse response JSON → throw on HTTP errors
//
//   buildAssistantMessage(data, fallbackSummary)
//     → construct a ChatMessage from a successful API response
//
//   applySuccess(set, sessionId, data, fallbackSummary)
//     → write assistant message + updated project/brief into sessions
//
//   applyError(set, sessionId, message)
//     → append error ChatMessage, set error flag, clear isLoading
//
// This is the single seam for all network interactions from the store.
// The three store actions (submitInitialPrompt, submitModifyPrompt, retryPrompt)
// are thin dispatchers that supply endpoint, body, and summary copy.

import type { ChatMessage } from "@/types/generate";

// ── Shared response shape ─────────────────────────────────────────────────────

export interface ApiResponse {
  project?: unknown;
  brief?: unknown;
  summary?: string;
  diagnostics?: {
    qualityResult?: unknown;
    rawBrief?: unknown;
    llmError?: string;
  };
  error?: string;
}

// ── callApi ───────────────────────────────────────────────────────────────────

/**
 * POST `endpoint` with `body`, injecting an Authorization header when `apiKey`
 * is non-empty. Returns the parsed JSON response.
 *
 * Throws a descriptive Error on:
 *   - Non-2xx HTTP status (tries to extract `summary` or `error` from the body)
 *   - Unparseable response body
 */
export async function callApi(
  endpoint: string,
  body: Record<string, unknown>,
  apiKey: string,
): Promise<ApiResponse> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let errMsg = `API Error: ${res.status} ${res.statusText}`;
    try {
      const errData = await res.json() as ApiResponse;
      if (errData.summary) errMsg = errData.summary;
      else if (errData.error) errMsg = errData.error;
    } catch {
      // ignore — body may not be valid JSON
    }
    throw new Error(errMsg);
  }

  return res.json() as Promise<ApiResponse>;
}

// ── buildAssistantMessage ─────────────────────────────────────────────────────

/**
 * Construct a successful assistant ChatMessage from a parsed API response.
 * `fallbackSummary` is used when the server doesn't include a `summary` field.
 */
export function buildAssistantMessage(
  data: ApiResponse,
  fallbackSummary: string,
): ChatMessage {
  return {
    id: generateMsgId(),
    role: "assistant",
    content: data.summary ?? fallbackSummary,
    project: data.project as ChatMessage["project"],
    brief: data.brief,
    diagnostics: data.diagnostics?.qualityResult as ChatMessage["diagnostics"],
    rawBrief: data.diagnostics?.rawBrief,
  };
}

// ── buildErrorMessage ─────────────────────────────────────────────────────────

/** Construct an error ChatMessage from a thrown Error message. */
export function buildErrorMessage(message: string): ChatMessage {
  return {
    id: generateErrMsgId(),
    role: "assistant",
    content: message,
    isError: true,
  };
}

// ── Store updaters ────────────────────────────────────────────────────────────
//
// These operate on the Zustand `set` function, keeping the shape of session
// updates in one place. The store actions call these instead of inlining the
// same state transform.

type SetFn = (fn: (state: { sessions: import("@/types/generate").Session[] }) => Partial<import("@/types/generate").Session[]> | object) => void;

/**
 * Append `assistantMsg` to the session's messages and update its project/brief.
 * Clears `isLoading`.
 */
export function applySuccess(
  set: (partial: object | ((state: object) => object)) => void,
  sessionId: string,
  assistantMsg: ChatMessage,
  data: Pick<ApiResponse, "project" | "brief">,
): void {
  set((state: { sessions: import("@/types/generate").Session[]; [k: string]: unknown }) => ({
    sessions: state.sessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            messages: [...s.messages, assistantMsg],
            project: data.project,
            brief: data.brief,
          }
        : s,
    ),
    isLoading: false,
  }));
}

/**
 * Append an error ChatMessage to the session's messages and set the store
 * `error` flag. Clears `isLoading`.
 */
export function applyError(
  set: (partial: object | ((state: object) => object)) => void,
  sessionId: string,
  message: string,
): void {
  set((state: { sessions: import("@/types/generate").Session[]; [k: string]: unknown }) => ({
    sessions: state.sessions.map((s) =>
      s.id === sessionId
        ? { ...s, messages: [...s.messages, buildErrorMessage(message)] }
        : s,
    ),
    error: message,
    isLoading: false,
  }));
}

// ── ID helpers (mirrors the private helper in store.ts) ───────────────────────

function randomSuffix() {
  return Math.random().toString(36).substring(2, 8);
}

function generateMsgId() {
  return `msg-${Date.now()}-${randomSuffix()}`;
}

function generateErrMsgId() {
  return `msg-err-${Date.now()}-${randomSuffix()}`;
}
