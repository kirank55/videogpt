// ── Dev Endpoint: Generate All Style Presets ──────────────────────────────────
//
// Dev-only route that produces 5 style variants of a video from a single prompt
// with ONE LLM call. The LLM generates one brief; we then override brief.style
// for each of the 5 STYLE_PRESET_KEYS and re-expand into 5 VideoProjects.
//
// This keeps the cost at 1 LLM call while letting you compare how the same
// content renders under modern / brutalist / sketch / neon-glow / minimal.

import { NextRequest, NextResponse } from "next/server";
import { GenerateRequestSchema } from "@/lib/agent/schemas/api";
import { runGeneratePipeline } from "@/lib/agent/ai/pipeline";
import { resolveDuration, STYLE_PRESET_KEYS, type StylePreset } from "@/lib/agent/schemas/brief";
import { hydrateBrief, buildProjectFromBrief } from "@/lib/agent/brief/buildProjectFromBrief";
import type { VideoBrief } from "@/lib/agent/schemas/brief";
import type { VideoProject } from "@/lib/ui/renderer";

interface StyleVariant {
  style: StylePreset;
  brief: VideoBrief;
  project: VideoProject;
}

// Pair each style with a palette that amplifies its aesthetic so the five
// variants look visibly distinct, not just subtly different.
const STYLE_PALETTE: Record<StylePreset, string> = {
  "modern": "midnight",
  "brutalist": "slate",
  "sketch": "paper",
  "neon-glow": "neon",
  "minimal": "ice",
};

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { prompt, duration: rawDuration } = parsed.data;
  const duration = resolveDuration(rawDuration);

  console.log(`[api/dev/generate-all-styles] prompt="${prompt}" duration=${duration}s`);
  const t0 = Date.now();

  // 1. One LLM call → one brief + envelope metadata
  const result = await runGeneratePipeline(prompt, duration);

  const { llmError } = result.diagnostics;
  if (llmError) {
    console.warn(`[api/dev/generate-all-styles] LLM error: ${llmError}`);
    return NextResponse.json(
      { error: llmError, summary: `⚠️ AI generation failed: ${llmError.slice(0, 120)}` },
      { status: 502 },
    );
  }

  // 2. Re-expand the brief under each style preset (no extra LLM calls)
  const variants: StyleVariant[] = STYLE_PRESET_KEYS.map((styleKey) => {
    const styledBrief = hydrateBrief({
      ...result.brief,
      style: styleKey,
      palette: STYLE_PALETTE[styleKey],
    });
    const project = buildProjectFromBrief(styledBrief, duration);
    project.name = result.projectName;
    return { style: styleKey, brief: styledBrief, project };
  });

  const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `[api/dev/generate-all-styles] done (${elapsed}s) — ${variants.length} style variants`,
  );

  return NextResponse.json({
    projectName: result.projectName,
    summary: result.summary || `Here's a ${duration}s animation for: "${prompt}".`,
    variants,
  });
}
