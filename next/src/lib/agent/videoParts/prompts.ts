import { z } from "zod";
import {
  BookendsContentSchema,
  videoPartJsonSchema,
  type VideoPartKind,
} from "@/lib/agent/videoParts/schemas";

const roleGuides: Record<VideoPartKind, string> = {
  title: "Write a concise, compelling video title and an optional explanatory subtitle. Generate no scene content.",
  summary: `Author a compact direct animated canvas timeline that introduces the topic and its essential structure. This Summary is the visual introduction; the independently generated Main Diagram explains the deeper mechanism.
Use one clear visual idea, no more than 6 short text events, and a small number of topic-specific shapes. Prefer a compact spatial overview, cutaway, relationship map, cycle, or simple flow only when the subject intrinsically calls for it. Avoid exhaustive steps, dense annotations, causal detail, generic card rows, and decorative complexity.
You control every visible background, text, shape, particle, coordinate, layer, color, timestamp, and animation. Return renderer events directly, never an intermediate graph, primitive plan, scene, storyboard, or layout name.`,
  "main-diagram": `Author one direct animated canvas timeline that explains one underlying mechanism, causal relationship, spatial model, cutaway, state transition, or interaction from the topic. This is the detailed Main Diagram, not an introduction or recap.
Choose a visual composition shaped by the subject. Do not imitate a summary with generic card rows, evenly spaced stage boxes, or left-to-right pipelines unless that exact structure is intrinsic to the subject. For software topics, prefer topology, changing state, memory, contention, routing decisions, or data movement over a generic request pipeline.
You control every visible background, text, shape, particle, coordinate, layer, color, timestamp, and animation. Use the complete safe TimelineEvent vocabulary in the schema. Compose complex visuals from multiple rectangles, circles, triangles, lines, icons, badges, progress shapes, particles, labels, and animated paths.
The canvas is 1920x1080. Use absolute coordinates, keep explanatory content legible inside generous margins, and use layer 0 for the background, layers 1-6 for diagram structure and motion, and layers 7+ for labels. Every normal diagram label and badge must use a font size of at least 24px; titles must use at least 32px. Give labels below title size a font weight of at least 600 and a high-contrast backdrop with at least 0.7 opacity and generous padding. Aim to keep every simultaneously visible text or badge box at least 8px away from every other label box throughout its animation; do not stack labels or place one over the title. If two labels need the same region, separate their active times or place them in open space with callout lines. Do not place small or low-contrast text directly over slabs, paths, lines, particles, or changing geometry. Include a background spanning the full duration, at least one readable label, at least three shapes, and visible motion or staggered reveals. Keep all event times within the requested duration.
Examples of composition thinking: a solar-cell prompt can draw a semiconductor cross-section with charge carriers separating; a database prompt can draw changing replica state and a lagging log cursor; a dam prompt can draw load paths through the structure into bedrock. Return renderer events directly, never an intermediate scene, graph, storyboard, or layout name.`,
  conclusion: "Write one concise closing line that resolves the explanation. Generate no title or scene content.",
};

export function buildVideoPartSystemPrompt(
  part: VideoPartKind,
  duration: number,
  visualContext?: string,
): string {
  const ownershipGuide = part === "summary" || part === "main-diagram"
    ? "The server owns only project id, canvas dimensions, duration, and final section offset. The canvas renderer draws your validated TimelineEvents exactly; no layout or scene-expansion pipeline will reposition them."
    : "The deterministic bookend renderer owns palette, style, coordinates, timing, and transitions.";
  return `
You write one authored part for an animated infographic video.
Return one JSON object that matches the provided schema exactly. Output no markdown or prose.

PART: ${part}
SEGMENT DURATION: ${duration}s
${visualContext ? `VISUAL CONTEXT: ${visualContext}` : ""}

${roleGuides[part]}

${ownershipGuide}
Use concise text that fits a 1920x1080 canvas.
Every event id must be unique, and every animation must belong to an event in this response.

JSON SCHEMA:
${JSON.stringify(videoPartJsonSchema(part))}
  `.trim();
}

export function buildBookendsSystemPrompt(
  duration: number,
  visualContext?: string,
): string {
  return `
You write the opening and closing copy for one animated infographic video.
Return one JSON object that matches the provided schema exactly. Output no markdown or prose.

PART: bookends
TOTAL VIDEO DURATION: ${duration}s
${visualContext ? `VISUAL CONTEXT: ${visualContext}` : ""}

Write a concise title, an optional explanatory subtitle, and one concise closing line that resolves the explanation. Do not write summary content, diagram events, scenes, coordinates, or styling.

JSON SCHEMA:
${JSON.stringify(z.toJSONSchema(BookendsContentSchema))}
  `.trim();
}

export function buildVideoPartRepairPrompt(
  originalPrompt: string,
  validationMessage: string,
  previousOutput?: string,
): string {
  const invalidOutput = previousOutput
    ? `\nPREVIOUS INVALID, TRUNCATED, OR MALFORMED OUTPUT:\n${previousOutput.slice(0, 60000)}\n`
    : "";
  return `
ORIGINAL REQUEST:
${originalPrompt}
${invalidOutput}

The previous JSON did not match the required part schema:
${validationMessage}

Correct the previous output in place. Preserve valid content and event IDs where possible, changing only what the validation finding requires. Return one corrected JSON object only. Keep exactly the keys allowed by the schema.
  `.trim();
}
