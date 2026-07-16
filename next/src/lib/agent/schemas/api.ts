import { z } from "zod";
import { SupportedDurationSchema } from "@/lib/others/schemas/duration";

export const GenerateRequestSchema = z.object({
  prompt: z.string().min(1),
  /**
   * Duration must be one of the supported values (5 | 10 | 15 | 20).
   * Falls back to 5 when omitted.
   */
  duration: SupportedDurationSchema.optional().default(5),
}).strict();

export type GenerateRequest = z.infer<typeof GenerateRequestSchema>;
