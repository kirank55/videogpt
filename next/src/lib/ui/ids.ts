// ── ID Generation ─────────────────────────────────────────────────────────────
//
// Single source of truth for generating unique identifiers across the app.
// Uses `crypto.randomUUID()` (native in all modern browsers and Node ≥ 19)
// for proper v4 UUIDs instead of weak `Math.random()` strings.

/**
 * Generate a unique ID, optionally prefixed for grep-ability.
 *
 * @example
 *   generateId("session") // → "session-a1b2c3d4-e5f6-..."
 *   generateId("msg")     // → "msg-a1b2c3d4-e5f6-..."
 *   generateId()          // → "a1b2c3d4-e5f6-..."
 */
export function generateId(prefix?: string): string {
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}-${uuid}` : uuid;
}
