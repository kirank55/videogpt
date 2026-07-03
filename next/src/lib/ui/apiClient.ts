// ── API Client ────────────────────────────────────────────────────────────────
//
// Owns the full path from HTTP request → ChatMessage → store update.
//
//   callApi(endpoint, body)
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
import { generateId } from "./ids";

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
): Promise<ApiResponse> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
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

// ── callApiStream ─────────────────────────────────────────────────────────────

export interface StreamCallbacks {
  /** Called for each "chunk" SSE event with a running token count. */
  onChunk: (tokenCount: number, charCount: number) => void;
  /** Called when the stream ends with the complete API response. */
  onDone: (response: ApiResponse) => void;
  /** Called on any error (network, parse, API error). */
  onError: (message: string) => void;
}

/**
 * POST `endpoint/stream` with `body` as an SSE streaming request.
 * Parses `data:` lines from the response and dispatches to callbacks.
 * Falls back to regular `callApi` if streaming is not supported.
 */
export async function callApiStream(
  endpoint: string,
  body: Record<string, unknown>,
  callbacks: StreamCallbacks,
): Promise<void> {
  const streamEndpoint = `${endpoint}/stream`;

  let res: Response;
  try {
    res = await fetch(streamEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    // Network error — fall back to regular request
    try {
      const data = await callApi(endpoint, body);
      callbacks.onDone(data);
    } catch (err) {
      callbacks.onError(err instanceof Error ? err.message : String(err));
    }
    return;
  }

  if (!res.ok || !res.body) {
    // Non-streaming fallback
    try {
      const data = await callApi(endpoint, body);
      callbacks.onDone(data);
    } catch (err) {
      callbacks.onError(err instanceof Error ? err.message : String(err));
    }
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const event = JSON.parse(trimmed.slice(6)) as {
            type?: string;
            tokenCount?: number;
            charCount?: number;
            message?: string;
          } & ApiResponse;

          if (event.type === "chunk") {
            callbacks.onChunk(event.tokenCount ?? 0, event.charCount ?? 0);
          } else if (event.type === "done") {
            callbacks.onDone(event);
          } else if (event.type === "error") {
            callbacks.onError(event.message ?? "Unknown streaming error");
          }
        } catch {
          // Malformed SSE line — skip
        }
      }
    }
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : String(err));
  } finally {
    reader.releaseLock();
  }
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
    id: generateId("msg"),
    role: "assistant",
    content: data.summary ?? fallbackSummary,
    project: data.project as ChatMessage["project"],
    brief: data.brief,
    diagnostics: data.diagnostics?.qualityResult as ChatMessage["diagnostics"],
    rawBrief: data.diagnostics?.rawBrief,
    createdAt: Date.now(),
  };
}

// ── buildErrorMessage ─────────────────────────────────────────────────────────

/** Construct an error ChatMessage from a thrown Error message. */
export function buildErrorMessage(message: string): ChatMessage {
  return {
    id: generateId("msg-err"),
    role: "assistant",
    content: message,
    isError: true,
    createdAt: Date.now(),
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

