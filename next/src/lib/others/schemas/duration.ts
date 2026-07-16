import { z } from "zod";

export const SUPPORTED_DURATIONS = [5, 10, 15, 20] as const;
export type SupportedDuration = (typeof SUPPORTED_DURATIONS)[number];

export const SupportedDurationSchema = z.union([
  z.literal(5),
  z.literal(10),
  z.literal(15),
  z.literal(20),
]);

export function resolveDuration(
  value: unknown,
  fallback: SupportedDuration = 5,
): SupportedDuration {
  return SUPPORTED_DURATIONS.includes(value as SupportedDuration)
    ? value as SupportedDuration
    : fallback;
}
