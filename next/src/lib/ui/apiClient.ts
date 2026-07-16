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
//     → write assistant message + composed project into sessions
//
//   applyError(set, sessionId, message)
//     → append error ChatMessage, set error flag, clear isLoading
//
// This is the single seam for all network interactions from the store.
// The store's initial generation and manual retry actions
// are thin dispatchers that supply endpoint, body, and summary copy.

import type { ChatMessage, GenerationPart } from "@/types/generate";
import { generateId } from "./ids";

// ── Shared response shape ─────────────────────────────────────────────────────

export interface ApiResponse {
  project?: unknown;
  projectName?: string;
  summary?: string;
  error?: string;
  requestId?: string;
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
  onStarted: (requestId: string) => void;
  onProgress: (progress: {
    part: GenerationPart;
    characterCount: number;
    estimatedTokens: number;
    completionTokens?: number;
  }) => void;
  onPartComplete: (part: GenerationPart, completionTokens?: number) => void;
  /** Called for each "phase" SSE event with the current pipeline phase. */
  onPhase: (phase: string) => void;
  /** Called when the stream ends with the complete API response. */
  onDone: (response: ApiResponse) => void;
  /** Called on any error (network, parse, API error). */
  onError: (message: string) => void;
}

/**
 * POST `endpoint/stream` with `body` as an SSE streaming request.
 * Parses `data:` lines from the response and dispatches to callbacks.
 * It never retries generation; users can retry a failed initial request
 * explicitly from its error message.
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
    callbacks.onError("Unable to connect to the generation stream.");
    return;
  }

  if (!res.ok || !res.body) {
    // Non-streaming fallback
    callbacks.onError(`API Error: ${res.status} ${res.statusText}`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let terminalEventReceived = false;

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
            requestId?: string;
            part?: GenerationPart;
            phase?: string;
            characterCount?: number;
            estimatedTokens?: number;
            completionTokens?: number;
            message?: string;
          } & ApiResponse;

          if (terminalEventReceived) continue;
          if (event.type === "started") {
            callbacks.onStarted(event.requestId ?? "");
          } else if (event.type === "phase") {
            callbacks.onPhase(event.phase ?? "");
          } else if (event.type === "model-progress" && event.part) {
            callbacks.onProgress({
              part: event.part,
              characterCount: event.characterCount ?? 0,
              estimatedTokens: event.estimatedTokens ?? 0,
              completionTokens: event.completionTokens,
            });
          } else if (event.type === "model-complete" && event.part) {
            callbacks.onPartComplete(event.part, event.completionTokens);
          } else if (event.type === "done") {
            terminalEventReceived = true;
            callbacks.onDone(event);
          } else if (event.type === "error") {
            terminalEventReceived = true;
            callbacks.onError(event.message ?? "Unknown streaming error");
          }
        } catch {
          // Malformed SSE line — skip
        }
      }
    }
    buffer += decoder.decode();
    if (!terminalEventReceived) {
      callbacks.onError("The generation stream ended before a result was received. Please try again.");
    }
  } catch (err) {
    if (!terminalEventReceived) {
      terminalEventReceived = true;
      callbacks.onError(err instanceof Error ? err.message : String(err));
    }
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

/**
 * Append `assistantMsg` to the session's messages and update its project.
 */
export function applySuccess(
  set: (partial: object | ((state: object) => object)) => void,
  sessionId: string,
  assistantMsg: ChatMessage,
  data: Pick<ApiResponse, "project" | "projectName">,
): void {
  set((state: { sessions: import("@/types/generate").Session[]; [k: string]: unknown }) => ({
    sessions: state.sessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            messages: [...s.messages, assistantMsg],
            project: data.project,
            ...(data.projectName ? { name: data.projectName } : {}),
          }
        : s,
    ),
  }));
}

/**
 * Append an error ChatMessage to the session's messages and set the store
 * error message.
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
  }));
}

