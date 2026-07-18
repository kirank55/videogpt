import type { SupportedDuration } from "@/lib/others/schemas/duration";

const CONTENT_SCENE_CEILINGS: Record<SupportedDuration, number> = {
  5: 1,
  10: 2,
  15: 3,
  20: 4,
};

export function maxContentScenesForDuration(
  duration: SupportedDuration,
): number {
  return CONTENT_SCENE_CEILINGS[duration];
}

export function contentSceneCountGuidance(
  duration: SupportedDuration,
): string {
  const ceiling = maxContentScenesForDuration(duration);
  return ceiling === 1
    ? "exactly 1 content scene"
    : `1 to ${ceiling} content scenes`;
}
