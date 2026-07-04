import type { SupportedDuration, VideoBrief } from "@/lib/agent/schemas/brief";

const ICONS = [
  "browser",
  "server",
  "database",
  "cloud",
  "lock",
  "globe",
  "gear",
  "code",
  "api",
  "mobile",
  "router",
  "shield",
  "cpu",
  "cache",
  "app",
  "building",
  "foundation",
  "beam",
  "floor",
  "elevator",
  "wall",
  "wrench",
  "water",
] as const;

const PALETTE_CATALOG = `
PALETTES (pick one name):
  "midnight" - deep navy/blue, blue+teal accents [tech, data, networking]
  "neon" - ultra-dark, cyan+pink accents [AI, ML, cyber]
  "aurora" - dark blue, purple+teal accents [science, space]
  "ember" - near-black, orange+red accents [performance, infra, ops]
  "forest" - near-black green, green+teal accents [biology, environment]
  "slate" - dark grey-blue, muted cool accents [enterprise, finance]
  "paper" - warm cream, rust+forest-green accents [education]
  "ice" - light blue-white, navy+sky accents [cloud, clean data]
`.trim();

const STYLE_CATALOG = `
STYLES (pick one name):
  "modern" - rounded, softly glowing, medium particles
  "brutalist" - sharp corners, no glow, no particles
  "sketch" - rougher dashed connectors, educational
  "neon-glow" - heavy bloom, dense haze
  "minimal" - thin lines, restrained motion
`.trim();

const COMPATIBILITY_HINTS = `
SOFT COMPATIBILITY GUIDANCE:
  neon -> neon-glow or modern
  paper -> sketch or minimal
  ember -> brutalist or modern
  midnight / aurora / slate -> modern, minimal, or neon-glow
  ice -> minimal or modern
  Avoid: paper + neon-glow, neon + brutalist
`.trim();

const GRAPH_GUIDE = `
GRAPH GUIDE:
Each scene has graph: { nodes, edges } and diagramLayout.
The expander computes coordinates. Do not output x/y.

diagramLayout choices:
  "pipeline" - ordered process, data flow, cause/effect, timelines
  "client-server" - request/response, before/after, compare, two systems talking
  "hub-spoke" - central service/entity with many dependents
  "stack" - layered architecture, hierarchy, vertical build-up

Node:
  { id, label, icon?, kind?, layoutRole?, color? }
  id must be unique inside the scene, lowercase-ish and stable.
  kind is visual/semantic flavor. layoutRole is only for placement.
  layoutRole values: client, server, shared, hub, spoke, source, step, sink.
  Use client/server/shared for client-server, hub/spoke for hub-spoke, and source/step/sink for pipeline.

Edge:
  { from, to, label?, animated?, packetLabel?, packetColor? }
  Use animated:true for request/response, data movement, handoffs, and feedback loops.

CONTENT BUDGETS:
  pipeline: max 5 nodes, max 5 blocks.
  client-server: max 6 nodes, max 4 blocks.
  hub-spoke: max 5 nodes, max 4 blocks.
  stack: max 5 nodes, max 5 blocks.
  All layouts: max 4 animated edges.
`.trim();

const VIDEO_BRIEF_JSON_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["title", "palette", "style", "scenes"],
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 1, maxLength: 80 },
    subtitle: { type: "string", maxLength: 120 },
    closingLine: { type: "string", maxLength: 100 },
    palette: { type: "string", enum: ["midnight", "neon", "aurora", "ember", "forest", "slate", "paper", "ice"] },
    style: { type: "string", enum: ["modern", "brutalist", "sketch", "neon-glow", "minimal"] },
    particleIntensity: { type: "number", minimum: 0, maximum: 3 },
    titleSize: { type: "string", enum: ["small", "medium", "large", "hero"] },
    titleAlign: { type: "string", enum: ["left", "center"] },
    closingStyle: { type: "string", enum: ["fade-up", "fade-center", "none"] },
    decorations: {
      type: "object",
      additionalProperties: false,
      properties: {
        cornerBrackets: { type: "boolean" },
        scanLines: { type: "boolean" },
        pulseRings: { type: "boolean" },
        gapDivider: { type: "boolean" },
        decoBaseline: { type: "boolean" },
      },
    },
    scenes: {
      type: "array",
      minItems: 1,
      maxItems: 8,
      items: {
        type: "object",
        required: [
          "heading",
          "diagramLayout",
          "blocks",
          "graph",
          "entryAnimation",
          "blockStyle",
          "transition",
        ],
        additionalProperties: false,
        properties: {
          heading: { type: "string", minLength: 1, maxLength: 70 },
          diagramLayout: { type: "string", enum: ["pipeline", "client-server", "hub-spoke", "stack"] },
          blocks: {
            type: "array",
            minItems: 2,
            maxItems: 5,
            items: {
              type: "object",
              required: ["heading", "description"],
              additionalProperties: false,
              properties: {
                heading: { type: "string", maxLength: 60 },
                description: { type: "string", maxLength: 150 },
                icon: { type: "string", enum: [...ICONS] },
              },
            },
          },
          graph: {
            type: "object",
            required: ["nodes", "edges"],
            additionalProperties: false,
            properties: {
              nodes: {
                type: "array",
                minItems: 1,
                maxItems: 8,
                items: {
                  type: "object",
                  required: ["id", "label"],
                  additionalProperties: false,
                  properties: {
                    id: { type: "string", maxLength: 40 },
                    label: { type: "string", maxLength: 50 },
                    icon: { type: "string", enum: [...ICONS] },
                    kind: { type: "string", maxLength: 30 },
                    layoutRole: {
                      type: "string",
                      enum: ["client", "server", "shared", "hub", "spoke", "source", "step", "sink"],
                    },
                    color: { type: "string", description: "Optional color token or CSS color." },
                  },
                },
              },
              edges: {
                type: "array",
                maxItems: 12,
                items: {
                  type: "object",
                  required: ["from", "to"],
                  additionalProperties: false,
                  properties: {
                    from: { type: "string" },
                    to: { type: "string" },
                    label: { type: "string", maxLength: 40 },
                    animated: { type: "boolean" },
                    packetLabel: { type: "string", maxLength: 20 },
                    packetColor: { type: "string" },
                  },
                },
              },
            },
          },
          entryAnimation: {
            type: "string",
            enum: ["slide-up", "slide-down", "slide-left", "slide-right", "fade-only", "scale-up", "bounce-in"],
          },
          blockStyle: { type: "string", enum: ["stacked", "cards", "timeline", "numbered"] },
          emphasizeIndex: { type: "integer", minimum: -1, maximum: 4 },
          transition: { type: "string", enum: ["none", "fade", "slide-left", "slide-right", "zoom-in", "zoom-out"] },
          sceneWeight: { type: "number", minimum: 0 },
          actEasings: {
            type: "object",
            additionalProperties: false,
            properties: {
              heading: { type: "string", enum: ["linear", "easeIn", "easeOut", "easeInOut", "bounce"] },
              content: { type: "string", enum: ["linear", "easeIn", "easeOut", "easeInOut", "bounce"] },
              flow: { type: "string", enum: ["linear", "easeIn", "easeOut", "easeInOut", "bounce"] },
            },
          },
          colorOverrides: {
            type: "object",
            additionalProperties: false,
            properties: {
              accent1: { type: "string" },
              accent2: { type: "string" },
              surface: { type: "string" },
            },
          },
        },
      },
    },
  },
};

const LLM_RESPONSE_ENVELOPE_SCHEMA: Record<string, unknown> = {
  type: "object",
  required: ["projectName", "summary", "brief"],
  additionalProperties: false,
  properties: {
    projectName: { type: "string", maxLength: 60 },
    summary: { type: "string", maxLength: 200 },
    brief: VIDEO_BRIEF_JSON_SCHEMA,
  },
};

export { LLM_RESPONSE_ENVELOPE_SCHEMA };

function suggestedSceneCount(duration: SupportedDuration): number {
  return Math.max(1, Math.round(duration / 5));
}

export function buildSystemPrompt(duration: SupportedDuration): string {
  const sceneCount = suggestedSceneCount(duration);
  const requestSeed = Math.floor(Math.random() * 1000000);
  return `
You are a video-brief writer for an animated infographic generator.
Output a single JSON object with exactly three top-level keys: projectName, summary, and brief.
No markdown, prose, or code fences.

The AI writes a VideoBrief. A deterministic pipeline computes coordinates, timing, transitions, particles, and all frame rendering.

VIDEO DURATION: ${duration}s
SUGGESTED SCENE COUNT: about ${sceneCount} scene${sceneCount === 1 ? "" : "s"} (roughly 1 scene per 5 seconds). Author that many scenes unless the topic genuinely needs fewer or more.
REQUEST_SEED: ${requestSeed}

RESPONSE ENVELOPE:
  projectName - short human-readable project name, max 60 chars.
  summary - 1-2 sentence summary for the chat UI, max 200 chars.
  brief - the VideoBrief object.

VIDEO-LEVEL FIELDS:
  title, subtitle?, closingLine?, palette, style, particleIntensity?, titleSize?, titleAlign?, closingStyle?, decorations?, scenes.
  Palette and style are global for coherence.

SCENE FIELDS:
  heading - scene title, smaller and more specific than the global title.
  diagramLayout - "pipeline" | "client-server" | "hub-spoke" | "stack".
  blocks - 2-5 content blocks: { heading, description, icon? }.
  graph - nodes and edges for the scene diagram.
  entryAnimation - scene content reveal style.
  blockStyle - "stacked" | "cards" | "timeline" | "numbered".
  emphasizeIndex - 0-based block/node emphasis, or -1 for none.
  transition - "none" | "fade" | "slide-left" | "slide-right" | "zoom-in" | "zoom-out".
  sceneWeight - optional relative duration weight.
  actEasings - optional { heading, content, flow } easing overrides.
  colorOverrides - optional scene accent/surface overrides.

VARY YOUR SCENES:
  Use different diagramLayout, entryAnimation, blockStyle, and transition choices across adjacent scenes.
  Never repeat the same combination on adjacent scenes.
  Each scene should add new information, not restate the same blocks.

${GRAPH_GUIDE}

ICONS:
  ${ICONS.join(" ")}
  Prefer concrete domain icons when the topic is physical or built-world:
  building/foundation/beam/floor/elevator/wall/wrench/water.

${PALETTE_CATALOG}

${STYLE_CATALOG}

${COMPATIBILITY_HINTS}

CONSTRAINTS:
  - Output only the JSON envelope.
  - Do not output coordinates, absolute timing numbers, or renderer event objects.
  - Every edge.from/edge.to must reference a node id in the same scene.
  - Use layoutRole to clarify placement when a strategy has semantic positions.
  - Stay within the layout-specific content budgets from the graph guide.
  - Use animated edges when motion helps explain flow.
  - Use at most 4 animated edges in a scene.
  - Do not force software metaphors onto physical, historical, medical, or civic topics.
  - For real-world processes, keep labels and stage order domain-accurate.
  - Keep text concise; the renderer wraps labels but cramped text makes weaker videos.
  - Schema reference: ${JSON.stringify(LLM_RESPONSE_ENVELOPE_SCHEMA)}
`.trim();
}

export function buildModifyPrompt(
  currentBrief: VideoBrief,
  instruction: string,
): string {
  return `
CURRENT VIDEO BRIEF (JSON):
\`\`\`json
${JSON.stringify(currentBrief, null, 2)}
\`\`\`

USER MODIFICATION INSTRUCTION:
"${instruction}"

Return a JSON object with three top-level keys: projectName, summary, and brief.
Preserve all scenes and fields the instruction does not affect.
Do not collapse scenes into a legacy layout.
Output only the JSON object.
`.trim();
}
