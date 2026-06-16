import { z } from "zod";

export const GenerateRequestSchema = z.object({
  prompt: z.string().min(1),
  duration: z.number().positive().optional().default(5),
  stylePreset: z.string().optional().default("modern"),
});

export const ModifyRequestSchema = z.object({
  sessionId: z.string().min(1),
  prompt: z.string().min(1),
  brief: z.unknown().optional(),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type ModifyRequest = z.infer<typeof ModifyRequestSchema>;
