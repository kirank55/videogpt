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

const DIAGRAM_GUIDE = `
DIAGRAM GUIDE:
Every scene chooses a diagramIntent.family.

Diagram families:
  "graph-flow" - software/system diagrams: architecture, APIs, queues, request/response, databases, event streams
  "field-range" - signals, coverage, waves, ranges, influence zones, trilateration
  "spatial-cutaway" - cross-sections, anatomy, geology, buildings, machines, infrastructure
  "build-up" - assembly, construction, manufacturing, layer-by-layer growth
  "cycle" - loops, circulation, feedback, lifecycle, natural cycles
  "comparison" - before/after, two models, opposing sides, alternate outcomes
  "timeline" - legal/civic processes, logistics stages, construction milestones, historical sequence

For graph-flow scenes:
  Use graph: { nodes, edges } as the primary diagram.
  diagramLayout may be "pipeline", "client-server", "hub-spoke", or "stack".
  Nodes and edges should be system-specific, not generic.

For non-graph scenes:
  Use diagramScript -> diagramIntent -> visualPrimitives + primitiveRelationships + storyboard.
  visualPrimitives are freeform prompt-shaped objects. Use types like "satellite", "range circle", "receiver pin", "soil layer", "concrete pier", "crane hook", "valve", "judge bench", etc.
  Assign drawingRole on each visualPrimitive when possible: mass, container, layer, support, path, flow, ring, pin, panel, label, background.
  primitiveRelationships are first-class verbs/choreography between primitives.
  Use relationships that help deterministic drawing: emitter-to-range, range-to-receiver, support-to-mass, layer-supports-mass, panel-on-mass, cycle-next, before-to-after.
  storyboard is the chronological drawing plan for the scene. It references primitive ids only; it never contains coordinates, SVG, or renderer events.
  Include at least 3 prompt-specific primitives and at least 2 relationships per non-graph scene.
  Use renderAs/shapeHint/materialHint to guide deterministic rendering.
  Do not use generic primitive labels like process, system, component, step, input, output, item, node, or element unless the user's prompt is actually about those terms.

diagramScript:
  { summary, beats, visualStory, mustShow, mustAvoid? }
  Developer-only creative intent. mustShow must name concrete visuals that also appear in visualPrimitives or primitiveRelationships.

diagramIntent:
  { family, subject, perspective?, signatureVisuals, motionCues, avoid? }

visualPrimitive:
  { id, type, label, description?, renderAs?, shapeHint?, materialHint?, role?, placementHint?, motion?, styleHint?, dependsOn?, drawingRole? }

primitiveRelationship:
  { from, to, relation, visualMetaphor?, motion?, timingRole? }
  from/to are arrays of primitive ids.

storyboard:
  { style: "line-drawing", continuityKey?, stages: [{ label, operation, primitiveIds }] }
  operation is one of: reveal, grow, connect, fill, pulse, trace, move.
  primitiveIds must reference visualPrimitive ids in the same scene.

Graph-flow graph node:
  { id, label, icon?, kind?, layoutRole?, color? }

Graph-flow graph edge:
  { from, to, label?, animated?, packetLabel?, packetColor? }
`.trim();

const PROCESS_TIMELINE_GUIDE = `
PROCESS / TIMELINE STORYTELLING:
When the user asks how a real-world thing is built, manufactured, assembled, shipped, constructed, or otherwise changes over time, make the middle content one chronological drawing animation, not unrelated topic panels.
  First pick the stage order. Scene headings, diagramScript.beats, and block headings must preserve that order.
  Put that order into storyboard.stages so the renderer can draw the same object gaining parts over time.
  Add relationships that bind the drawing together, such as foundation supports core, core supports tower mass, cladding panels attach to tower mass.
  Use stage/time labels when natural: Month 0, Year 1, Year 2, Phase 3, or Step 4.
  Each scene's visualStory should answer what is added next, with visible changes such as excavate, pour, core rises, floors repeat, cladding climbs, doors open.
  Prefer diagramIntent.family "timeline" or "build-up", diagramLayout "pipeline" or "stack", and blockStyle "timeline" or "numbered".
  Carry visual continuity across adjacent scenes: the same drawing should progressively gain the next piece.
  For skyscraper construction, a coherent order is: Groundbreaking -> Deep Pit & Foundation -> Core Breaks Ground -> Speed Rise -> Topping Out & Cladding -> Grand Opening.
`.trim();

const DEFAULT_VIDEO_STRUCTURE_GUIDE = `
DEFAULT VIDEO STRUCTURE:
For normal explainer prompts, produce exactly two content scenes between the automatic title and conclusion.
  Scene 1 is Phase 1 / setup / context: introduce the starting state, initial components, source material, actors, base, or problem.
  Scene 2 is the single main diagram animation before the conclusion: one coherent drawing, graph, cycle, comparison, timeline, or flow that explains the full mechanism.
  Do not create separate content scenes for every phase unless the user explicitly asks for a multi-part or multi-scene video.
  The title is handled by brief.title/subtitle. The conclusion is handled by closingLine. Do not add title or conclusion as scenes.
  If the topic has many stages, put those stages into Scene 2 storyboard.stages instead of creating many scenes.
  Scene 2 should carry the full visual explanation; Scene 1 should be a compact setup/phase-1 scene, not another full repeated diagram.
`.trim();

const FIRST_PASS_QUALITY_GATE = `
FIRST-PASS QUALITY GATE:
Before writing the final JSON, silently audit your brief and revise it once inside this same response.
Do not output draft notes, audit notes, or an alternate brief.
The final JSON must already pass these checks:
  - Normal explainer prompts have exactly two content scenes: Phase 1 setup/context, then one main diagram animation before the conclusion.
  - Non-graph scenes have storyboard.style "line-drawing" and storyboard stages that reference existing visualPrimitive ids.
  - Non-graph scenes have at least 3 prompt-specific visualPrimitives, at least 2 primitiveRelationships, and useful drawingRole values.
  - primitiveRelationships only reference visualPrimitive ids that exist in the same scene.
  - diagramScript.mustShow items are visible in visualPrimitives or primitiveRelationships.
  - Real-world process prompts preserve chronological continuity in storyboard.stages instead of separate repetitive scenes.
  - Graph-flow scenes have a valid graph with concrete topic-specific nodes and edges.
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
          "diagramScript",
          "diagramIntent",
          "diagramLayout",
          "blocks",
          "entryAnimation",
          "blockStyle",
          "transition",
        ],
        additionalProperties: false,
        properties: {
          heading: { type: "string", minLength: 1, maxLength: 70 },
          diagramScript: {
            type: "object",
            required: ["summary", "beats", "visualStory", "mustShow"],
            additionalProperties: false,
            properties: {
              summary: { type: "string", maxLength: 180 },
              beats: { type: "array", minItems: 1, maxItems: 6, items: { type: "string", maxLength: 100 } },
              visualStory: { type: "string", maxLength: 260 },
              mustShow: { type: "array", minItems: 1, maxItems: 8, items: { type: "string", maxLength: 60 } },
              mustAvoid: { type: "array", maxItems: 8, items: { type: "string", maxLength: 60 } },
            },
          },
          diagramIntent: {
            type: "object",
            required: ["family", "subject", "signatureVisuals", "motionCues"],
            additionalProperties: false,
            properties: {
              family: {
                type: "string",
                enum: ["graph-flow", "spatial-cutaway", "field-range", "build-up", "cycle", "comparison", "timeline"],
              },
              subject: { type: "string", maxLength: 100 },
              perspective: {
                type: "string",
                enum: ["top-down", "side-elevation", "cross-section", "orbit", "abstract"],
              },
              signatureVisuals: { type: "array", minItems: 1, maxItems: 8, items: { type: "string", maxLength: 60 } },
              motionCues: { type: "array", maxItems: 8, items: { type: "string", maxLength: 80 } },
              avoid: { type: "array", maxItems: 8, items: { type: "string", maxLength: 60 } },
            },
          },
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
          visualPrimitives: {
            type: "array",
            maxItems: 12,
            items: {
              type: "object",
              required: ["id", "type", "label"],
              additionalProperties: false,
              properties: {
                id: { type: "string", maxLength: 40 },
                type: { type: "string", maxLength: 60 },
                label: { type: "string", maxLength: 70 },
                description: { type: "string", maxLength: 160 },
                renderAs: { type: "string", maxLength: 40 },
                shapeHint: { type: "string", maxLength: 40 },
                materialHint: { type: "string", maxLength: 40 },
                role: { type: "string", maxLength: 40 },
                placementHint: { type: "string", maxLength: 40 },
                motion: { type: "string", maxLength: 80 },
                styleHint: { type: "string", maxLength: 40 },
                dependsOn: { type: "array", maxItems: 8, items: { type: "string", maxLength: 40 } },
                drawingRole: {
                  type: "string",
                  enum: ["mass", "container", "layer", "support", "path", "flow", "ring", "pin", "panel", "label", "background"],
                },
              },
            },
          },
          primitiveRelationships: {
            type: "array",
            maxItems: 12,
            items: {
              type: "object",
              required: ["from", "to", "relation"],
              additionalProperties: false,
              properties: {
                from: { type: "array", minItems: 1, maxItems: 8, items: { type: "string", maxLength: 40 } },
                to: { type: "array", minItems: 1, maxItems: 8, items: { type: "string", maxLength: 40 } },
                relation: { type: "string", maxLength: 90 },
                visualMetaphor: { type: "string", maxLength: 120 },
                motion: { type: "string", maxLength: 100 },
                timingRole: {
                  type: "string",
                  enum: ["setup", "reveal-mechanism", "highlight-result", "loop", "background"],
                },
              },
            },
          },
          storyboard: {
            type: "object",
            required: ["style", "stages"],
            additionalProperties: false,
            properties: {
              style: { type: "string", enum: ["line-drawing"] },
              continuityKey: { type: "string", maxLength: 60 },
              stages: {
                type: "array",
                minItems: 1,
                maxItems: 8,
                items: {
                  type: "object",
                  required: ["label", "operation", "primitiveIds"],
                  additionalProperties: false,
                  properties: {
                    label: { type: "string", maxLength: 60 },
                    operation: { type: "string", enum: ["reveal", "grow", "connect", "fill", "pulse", "trace", "move"] },
                    primitiveIds: { type: "array", minItems: 1, maxItems: 8, items: { type: "string", maxLength: 40 } },
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
SUGGESTED SCENE COUNT: about ${sceneCount} scene${sceneCount === 1 ? "" : "s"} (roughly 1 scene per 5 seconds). This is a capacity hint; the default two-content-scene structure below overrides it for normal explainers.
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
  diagramScript - developer-only visual story: summary, beats, visualStory, mustShow, mustAvoid?.
  diagramIntent - family, subject, perspective?, signatureVisuals, motionCues, avoid?.
  diagramLayout - "pipeline" | "client-server" | "hub-spoke" | "stack".
  blocks - 2-5 concise supporting blocks: { heading, description, icon? }.
  graph - required and primary for graph-flow scenes; optional supporting structure otherwise.
  visualPrimitives - required for non-graph scenes; freeform prompt-shaped diagram objects.
  primitiveRelationships - required for non-graph scenes; first-class relationships between primitives.
  storyboard - required for non-graph scenes; line-drawing stages that reference visualPrimitives by id.
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
  Physical, scientific, civic, medical, historical, and built-world scenes should usually be primitive-first, not graph-flow.
  Software/system scenes should use graph-flow when nodes and edges are the clearest explanation.

${DIAGRAM_GUIDE}

${PROCESS_TIMELINE_GUIDE}

${DEFAULT_VIDEO_STRUCTURE_GUIDE}

${FIRST_PASS_QUALITY_GATE}

ICONS:
  ${ICONS.join(" ")}
  Prefer concrete domain icons when the topic is physical or built-world:
  building/foundation/beam/floor/elevator/wall/wrench/water.

${PALETTE_CATALOG}

${STYLE_CATALOG}

${COMPATIBILITY_HINTS}

CONSTRAINTS:
  - Output only the JSON envelope.
  - For normal explainer prompts, return exactly two content scenes: Phase 1 setup/context and one main diagram animation before the conclusion.
  - Do not add title or conclusion scenes; use brief.title, subtitle, and closingLine for bookends.
  - Do not output coordinates, absolute timing numbers, or renderer event objects.
  - For graph-flow scenes, every edge.from/edge.to must reference a node id in the same scene.
  - For non-graph scenes, every primitiveRelationship from/to id must reference a visualPrimitive id in the same scene.
  - For non-graph scenes, include at least 3 prompt-specific visualPrimitives and at least 2 primitiveRelationships.
  - For non-graph scenes, include storyboard with style "line-drawing" and stages that reference visualPrimitive ids.
  - diagramScript.mustShow items must appear in visualPrimitives or primitiveRelationships.
  - Do not put coordinates, raw SVG, canvas commands, or renderer event objects in storyboard or primitives.
  - Use layoutRole to clarify placement when a strategy has semantic positions.
  - Stay within the layout-specific content budgets from the diagram guide.
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

export function buildPrimitiveRetryPrompt(
  originalUserPrompt: string,
  diagnosticFeedback: string,
): string {
  return `
ORIGINAL USER REQUEST:
"${originalUserPrompt}"

THE PREVIOUS JSON BRIEF HAD A HARD STRUCTURAL FAILURE:
${diagnosticFeedback}

${PROCESS_TIMELINE_GUIDE}

${DEFAULT_VIDEO_STRUCTURE_GUIDE}

${FIRST_PASS_QUALITY_GATE}

Return a corrected JSON object with exactly three top-level keys: projectName, summary, and brief.
Keep graph-flow only for software/system scenes where nodes and edges are genuinely the right abstraction.
For non-graph scenes, preserve the diagramScript and make visualPrimitives and primitiveRelationships specific to the user's prompt.
For non-graph scenes, include storyboard stages that reference visualPrimitive ids and use drawingRole on primitives when possible.
Output only the JSON object.
`.trim();
}
