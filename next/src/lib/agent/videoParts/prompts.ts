import type { SupportedDuration } from "@/lib/agent/schemas/brief";
import {
  videoPartJsonSchema,
  type VideoPartKind,
} from "@/lib/agent/videoParts/schemas";

const roleGuides: Record<VideoPartKind, string> = {
  title: "Write a concise, compelling video title and an optional explanatory subtitle. Generate no scene content.",
  summary: `Write only a simple, clean, and precise visual overview. The Summary establishes the topic and its essential structure. The Main Diagram will explain the detailed mechanism.
Use one visual idea, 2-3 short supporting blocks, no more than 5 graph nodes or 3-6 visual primitives, and only 2-4 storyboard stages. Include only details required to recognize the subject and understand the high-level sequence. Avoid secondary components, exhaustive construction steps, dense labels, and decorative complexity.
Choose diagramFamily "graph-flow" only when movement between discrete entities is the meaningful visual metaphor, such as software request routing. Do not use connected boxes merely because steps are chronological.
For physical construction, manufacturing, natural processes, scientific, spatial, or civic topics, choose a compact primitive family: "build-up", "spatial-cutaway", "field-range", "timeline", "cycle", or "comparison". A dam construction summary should use build-up or spatial-cutaway to show only the essential foundation, dam body/core, and retained water; it should not send generic packets between stage boxes. Software request routing may use graph-flow.
For primitive summaries, choose concrete prompt-specific primitives and relationships with visible motion such as excavating, growing, filling, tracing, sealing, or pulsing. Express excavation with storyboard operation "move", structural rise with "grow", sealing or retained material with "fill", paths with "trace", and emphasis with "pulse". Keep the supporting blocks concise and leave the complete mechanism to the main diagram.`,
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
  previousOutput?: string,
): string {
  const malformedOutput = previousOutput
    ? `\nPREVIOUS TRUNCATED OR MALFORMED OUTPUT:\n${previousOutput.slice(0, 6000)}\n`
    : "";
  return `
ORIGINAL REQUEST:
${originalPrompt}
${malformedOutput}

The previous JSON did not match the required part schema:
${validationMessage}

Return one corrected JSON object only. Keep exactly the keys allowed by the schema.
  `.trim();
}
