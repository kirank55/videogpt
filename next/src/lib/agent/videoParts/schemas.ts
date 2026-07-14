import { z } from "zod";
import {
  BlockSchema,
  DiagramIntentSchema,
  DiagramLayoutSchema,
  DiagramScriptSchema,
  GraphEdgeSchema,
  GraphNodeSchema,
  PrimitiveRelationshipSchema,
  StoryboardStageSchema,
  SupportedDurationSchema,
  VisualPrimitiveSchema,
} from "@/lib/agent/schemas/brief";
import type { VideoProject } from "@/lib/ui/renderer";

export const VideoPartKindSchema = z.enum([
  "title",
  "summary",
  "main-diagram",
  "conclusion",
]);
export type VideoPartKind = z.infer<typeof VideoPartKindSchema>;

const StrictBlockSchema = BlockSchema.strict();
const StrictGraphNodeSchema = GraphNodeSchema.strict();
const StrictGraphEdgeSchema = GraphEdgeSchema.strict();

const StrictGraphSchema = z.object({
  nodes: z.array(StrictGraphNodeSchema).min(1).max(8),
  edges: z.array(StrictGraphEdgeSchema).max(12),
}).strict().superRefine((graph, ctx) => {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  graph.edges.forEach((edge, index) => {
    if (!nodeIds.has(edge.from)) {
      ctx.addIssue({
        code: "custom",
        message: `Edge source "${edge.from}" does not reference a graph node.`,
        path: ["edges", index, "from"],
      });
    }
    if (!nodeIds.has(edge.to)) {
      ctx.addIssue({
        code: "custom",
        message: `Edge target "${edge.to}" does not reference a graph node.`,
        path: ["edges", index, "to"],
      });
    }
  });
});

export const TitlePartContentSchema = z.object({
  title: z.string().min(1).max(80),
  subtitle: z.string().min(1).max(120).optional(),
}).strict();
export type TitlePartContent = z.infer<typeof TitlePartContentSchema>;

export const SummaryPartContentSchema = z.object({
  heading: z.string().min(1).max(70),
  diagramLayout: DiagramLayoutSchema,
  blocks: z.array(StrictBlockSchema).min(2).max(5),
  graph: StrictGraphSchema,
}).strict();
export type SummaryPartContent = z.infer<typeof SummaryPartContentSchema>;

const StrictVisualPrimitiveSchema = VisualPrimitiveSchema.strict();
const StrictPrimitiveRelationshipSchema = PrimitiveRelationshipSchema.strict();
const StrictDiagramScriptSchema = DiagramScriptSchema.strict();
const StrictPrimitiveDiagramIntentSchema = DiagramIntentSchema
  .omit({ family: true })
  .strict();
const StrictStoryboardSchema = z.object({
  style: z.literal("line-drawing"),
  continuityKey: z.string().min(1).max(80).optional(),
  stages: z.array(StoryboardStageSchema.strict()).min(1).max(8),
}).strict();

const GraphMainDiagramPartContentSchema = z.object({
  diagramFamily: z.literal("graph-flow"),
  heading: z.string().min(1).max(70),
  diagramLayout: DiagramLayoutSchema,
  blocks: z.array(StrictBlockSchema).min(2).max(5),
  graph: StrictGraphSchema,
}).strict();

const PrimitiveMainDiagramPartContentSchema = z.object({
  diagramFamily: z.enum([
    "spatial-cutaway",
    "field-range",
    "build-up",
    "cycle",
    "comparison",
    "timeline",
  ]),
  heading: z.string().min(1).max(70),
  diagramScript: StrictDiagramScriptSchema,
  diagramIntent: StrictPrimitiveDiagramIntentSchema,
  visualPrimitives: z.array(StrictVisualPrimitiveSchema).min(3).max(12),
  primitiveRelationships: z.array(StrictPrimitiveRelationshipSchema).min(2).max(12),
  storyboard: StrictStoryboardSchema,
}).strict().superRefine((content, ctx) => {
  const primitiveIds = new Set(content.visualPrimitives.map((primitive) => primitive.id));
  content.primitiveRelationships.forEach((relationship, index) => {
    [...relationship.from, ...relationship.to].forEach((id) => {
      if (!primitiveIds.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: `Relationship references missing primitive "${id}".`,
          path: ["primitiveRelationships", index],
        });
      }
    });
  });
  content.storyboard.stages.forEach((stage, index) => {
    stage.primitiveIds.forEach((id) => {
      if (!primitiveIds.has(id)) {
        ctx.addIssue({
          code: "custom",
          message: `Storyboard stage references missing primitive "${id}".`,
          path: ["storyboard", "stages", index, "primitiveIds"],
        });
      }
    });
  });
});

export const MainDiagramPartContentSchema = z.discriminatedUnion("diagramFamily", [
  GraphMainDiagramPartContentSchema,
  PrimitiveMainDiagramPartContentSchema,
]);
export type MainDiagramPartContent = z.infer<typeof MainDiagramPartContentSchema>;

export const ConclusionPartContentSchema = z.object({
  closingLine: z.string().min(1).max(100),
}).strict();
export type ConclusionPartContent = z.infer<typeof ConclusionPartContentSchema>;

export const GenerateVideoPartRequestSchema = z.object({
  part: VideoPartKindSchema,
  prompt: z.string().trim().min(1),
  duration: SupportedDurationSchema,
}).strict();
export type GenerateVideoPartRequest = z.infer<typeof GenerateVideoPartRequestSchema>;

export type AuthoredVideoPart =
  | { part: "title"; content: TitlePartContent }
  | { part: "summary"; content: SummaryPartContent }
  | { part: "main-diagram"; content: MainDiagramPartContent }
  | { part: "conclusion"; content: ConclusionPartContent };

export type GeneratedVideoPart = AuthoredVideoPart & { project: VideoProject };
export type GenerateVideoPartResponse = GeneratedVideoPart;

const VIDEO_PART_CONTENT_SCHEMAS = {
  title: TitlePartContentSchema,
  summary: SummaryPartContentSchema,
  "main-diagram": MainDiagramPartContentSchema,
  conclusion: ConclusionPartContentSchema,
} as const;

export function videoPartJsonSchema(part: VideoPartKind): Record<string, unknown> {
  return z.toJSONSchema(VIDEO_PART_CONTENT_SCHEMAS[part]) as Record<string, unknown>;
}

export function parseAuthoredVideoPart(part: VideoPartKind, raw: unknown): AuthoredVideoPart {
  switch (part) {
    case "title":
      return { part, content: TitlePartContentSchema.parse(raw) };
    case "summary":
      return { part, content: SummaryPartContentSchema.parse(raw) };
    case "main-diagram":
      return { part, content: MainDiagramPartContentSchema.parse(raw) };
    case "conclusion":
      return { part, content: ConclusionPartContentSchema.parse(raw) };
  }
}
