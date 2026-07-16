import { z } from "zod";
import { TimelineEventSchema } from "@/lib/others/schemas/timeline";
import { SupportedDurationSchema } from "@/lib/others/schemas/duration";
import type { VideoProject } from "@/lib/ui/renderer";

export const VideoPartKindSchema = z.enum([
  "title",
  "summary",
  "main-diagram",
  "conclusion",
]);
export type VideoPartKind = z.infer<typeof VideoPartKindSchema>;

export const BookendsContentSchema = z.object({
  title: z.string().min(1).max(80),
  subtitle: z.string().min(1).max(120).optional(),
  closingLine: z.string().min(1).max(100),
}).strict();
export type BookendsContent = z.infer<typeof BookendsContentSchema>;

export const TitlePartContentSchema = BookendsContentSchema.pick({
  title: true,
  subtitle: true,
}).strict();
export type TitlePartContent = z.infer<typeof TitlePartContentSchema>;

export const SummaryPartContentSchema = z.object({
  mode: z.literal("direct-summary-timeline"),
  name: z.string().min(1).max(80),
  visualIntent: z.string().min(1).max(400),
  events: z.array(TimelineEventSchema).min(4).max(40),
}).strict();
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
