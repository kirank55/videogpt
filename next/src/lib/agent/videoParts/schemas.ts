import { z } from "zod";
import {
  BlockSchema,
  DiagramLayoutSchema,
  GraphEdgeSchema,
  GraphNodeSchema,
  PrimitiveRelationshipSchema,
  StoryboardStageSchema,
  SupportedDurationSchema,
  VisualPrimitiveSchema,
} from "@/lib/agent/schemas/brief";
import { TimelineEventSchema } from "@/lib/others/schemas/timeline";
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

type GraphReferenceContent = {
  nodes: Array<{ id: string }>;
  edges: Array<{ from: string; to: string }>;
};

function validateGraphReferences(
  graph: GraphReferenceContent,
  ctx: z.RefinementCtx,
) {
  const nodeIds = new Set(graph.nodes.map((node) => node.id));
  const seenNodeIds = new Set<string>();
  graph.nodes.forEach((node, index) => {
    if (seenNodeIds.has(node.id)) {
      ctx.addIssue({
        code: "custom",
        message: `Graph node id "${node.id}" must be unique.`,
        path: ["nodes", index, "id"],
      });
    }
    seenNodeIds.add(node.id);
  });
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
}

const StrictSummaryGraphSchema = z.object({
  nodes: z.array(StrictGraphNodeSchema).min(1).max(5),
  edges: z.array(StrictGraphEdgeSchema).max(5),
}).strict().superRefine((graph, ctx) => {
  validateGraphReferences(graph, ctx);
});

export const TitlePartContentSchema = z.object({
  title: z.string().min(1).max(80),
  subtitle: z.string().min(1).max(120).optional(),
}).strict();
export type TitlePartContent = z.infer<typeof TitlePartContentSchema>;

const StrictVisualPrimitiveSchema = VisualPrimitiveSchema.strict();
const StrictPrimitiveRelationshipSchema = PrimitiveRelationshipSchema.strict();

type PrimitiveReferenceContent = {
  visualPrimitives: Array<{ id: string }>;
  primitiveRelationships: Array<{ from: string[]; to: string[] }>;
  storyboard: { stages: Array<{ primitiveIds: string[] }> };
};

function validatePrimitiveReferences(
  content: PrimitiveReferenceContent,
  ctx: z.RefinementCtx,
) {
  const primitiveIds = new Set(content.visualPrimitives.map((primitive) => primitive.id));
  const seenPrimitiveIds = new Set<string>();
  content.visualPrimitives.forEach((primitive, index) => {
    if (seenPrimitiveIds.has(primitive.id)) {
      ctx.addIssue({
        code: "custom",
        message: `Visual primitive id "${primitive.id}" must be unique.`,
        path: ["visualPrimitives", index, "id"],
      });
    }
    seenPrimitiveIds.add(primitive.id);
  });
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
}

export const GraphSummaryPartContentSchema = z.object({
  diagramFamily: z.literal("graph-flow"),
  heading: z.string().min(1).max(70),
  diagramLayout: DiagramLayoutSchema,
  blocks: z.array(StrictBlockSchema).min(2).max(3),
  graph: StrictSummaryGraphSchema,
}).strict();

export const PrimitiveSummaryPartContentSchema = z.object({
  diagramFamily: z.enum([
    "spatial-cutaway",
    "field-range",
    "build-up",
    "cycle",
    "comparison",
    "timeline",
  ]),
  heading: z.string().min(1).max(70),
  blocks: z.array(StrictBlockSchema).min(2).max(3),
  visualPrimitives: z.array(StrictVisualPrimitiveSchema).min(3).max(6),
  primitiveRelationships: z.array(StrictPrimitiveRelationshipSchema).min(2).max(5),
  storyboard: z.object({
    style: z.literal("line-drawing"),
    continuityKey: z.string().min(1).max(80).optional(),
    stages: z.array(StoryboardStageSchema.strict()).min(2).max(4),
  }).strict(),
}).strict().superRefine(validatePrimitiveReferences);

export const SummaryPartContentSchema = z.discriminatedUnion("diagramFamily", [
  GraphSummaryPartContentSchema,
  PrimitiveSummaryPartContentSchema,
]);
export type SummaryPartContent = z.infer<typeof SummaryPartContentSchema>;

export const MainDiagramPartContentSchema = z.object({
  mode: z.literal("direct-timeline"),
  name: z.string().min(1).max(80),
  visualIntent: z.string().min(1).max(400),
  events: z.array(TimelineEventSchema).min(4).max(80),
}).strict();
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
