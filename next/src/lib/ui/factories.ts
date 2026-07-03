// ── Domain Object Factories ───────────────────────────────────────────────────
//
// Pure factory functions for creating Sessions and ChatMessages.
// Keeps object construction out of the store actions so they read like intent.

import type { ChatMessage, Session } from "@/types/generate";
import { generateId } from "./ids";

/**
 * Format a human-readable "Edited ..." string for `Session.updatedAt`.
 */
export function formatUpdatedAt(date: Date = new Date()): string {
  return `Edited ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

/**
 * Create a new user ChatMessage.
 */
export function createUserMessage(content: string): ChatMessage {
  return {
    id: generateId("msg"),
    role: "user",
    content,
    createdAt: Date.now(),
  };
}

/**
 * Create a new Session with an initial user message.
 */
export function createSession(prompt: string): { session: Session; sessionId: string } {
  const sessionId = generateId("session");
  const userMsg = createUserMessage(prompt);

  const session: Session = {
    id: sessionId,
    name: prompt.slice(0, 30) || "Untitled Project",
    messages: [userMsg],
    updatedAt: formatUpdatedAt(),
  };

  return { session, sessionId };
}
