import { z } from "zod";
import { SupportedDurationSchema } from "@/lib/agent/schemas/brief";

export const GenerateRequestSchema = z.object({
  prompt: z.string().min(1),
  /**
   * Duration must be one of the supported values (5 | 10 | 15 | 20 | 30).
   * Falls back to 5 when omitted.
   */
  duration: SupportedDurationSchema.optional().default(5),
});

export const ModifyRequestSchema = z.object({
  sessionId: z.string().min(1),
  prompt: z.string().min(1),
  brief: z.unknown().optional(),
});

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
export type ModifyRequest = z.infer<typeof ModifyRequestSchema>;
