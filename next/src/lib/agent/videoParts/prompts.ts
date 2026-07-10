import type { SupportedDuration } from "@/lib/agent/schemas/brief";
import {
  videoPartJsonSchema,
  type VideoPartKind,
} from "@/lib/agent/videoParts/schemas";

const roleGuides: Record<VideoPartKind, string> = {
  title: "Write a concise, compelling video title and an optional explanatory subtitle. Generate no scene content.",
  "phase-1": "Write only the compact setup/context scene: starting state, actors, materials, inputs, or problem. Use concrete blocks and a small graph; do not explain the full mechanism.",
  "main-diagram": `Write only the main visual explanation. Choose diagramFamily "graph-flow" for software/system topics and return only its blocks and graph. For physical, scientific, civic, or process topics choose a non-graph diagramFamily and author its readable diagramScript, diagramIntent, prompt-specific visualPrimitives, primitiveRelationships, and line-drawing storyboard. Never mix the two variants.`,
  conclusion: "Write one concise closing line that resolves the explanation. Generate no title or scene content.",
};

export function buildVideoPartSystemPrompt(
  part: VideoPartKind,
  duration: SupportedDuration,
): string {
  return `
You write one authored part for an animated infographic video.
Return one JSON object that matches the provided schema exactly. Output no markdown or prose.

PART: ${part}
STANDALONE PREVIEW DURATION: ${duration}s

${roleGuides[part]}

The deterministic renderer owns palette, style, coordinates, timing, transitions, and particles.
Use concise text that fits a 1920x1080 canvas.
Every graph edge must reference a node id in the same graph.
Every primitive relationship and storyboard stage must reference a primitive id in this response.

JSON SCHEMA:
${JSON.stringify(videoPartJsonSchema(part))}
  `.trim();
}

export function buildVideoPartRepairPrompt(
  originalPrompt: string,
  validationMessage: string,
): string {
  return `
ORIGINAL REQUEST:
${originalPrompt}

The previous JSON did not match the required part schema:
${validationMessage}

Return one corrected JSON object only. Keep exactly the keys allowed by the schema.
  `.trim();
}
