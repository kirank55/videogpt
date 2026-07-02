// ── Centralized Environment Validation ────────────────────────────────────────
//
// Import this module wherever you need env vars. Zod validates at import time,
// so the app fails fast with a clear error if any required variable is missing.
//
// Server-only: all variables here are server-side (`process.env.*`).
// Never prefix keys with NEXT_PUBLIC_ — API keys must not leak to the browser.

import { z } from "zod";

const envSchema = z.object({
  /** OpenRouter API key (required for all AI calls). */
  OPENROUTER_API_KEY: z
    .string()
    .min(1, "OPENROUTER_API_KEY is required. Add it to .env.local"),

  /** Default LLM model identifier used for prompt translation. */
  DEFAULT_MODEL: z.string().optional(),

  /** LLM model identifier for visual-check QA analysis. */
  VISUAL_CHECK_MODEL: z.string().optional(),

  /** Directory for bulk generation scripts output. Only needed for CLI scripts. */
  BRAIN_DIR: z.string().optional(),

  /** Current Node environment. */
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof envSchema>;

function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    console.error(
      "\n❌ Invalid environment variables:\n" +
        formatted +
        "\n\nSee .env.example for reference.\n",
    );
    throw new Error("Environment validation failed");
  }

  return result.data;
}

/**
 * Validated environment variables. Access these instead of `process.env` directly.
 *
 * @example
 * ```ts
 * import { env } from "@/lib/env";
 * const key = env.OPENROUTER_API_KEY;
 * ```
 */
export const env = validateEnv();
