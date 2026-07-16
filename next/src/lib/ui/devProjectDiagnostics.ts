import type { VideoProject } from "@/lib/ui/renderer";

export type DirectTimelineDiagnostics = {
  mode: "direct-timeline" | "direct-summary-timeline";
  name: string;
  visualIntent: string;
  eventCount: number;
  eventTypeCounts: {
    background: number;
    text: number;
    shape: number;
    particle: number;
  };
  layers: number[];
  timelineStart: number;
  timelineEnd: number;
};

/** Extracts user-facing diagnostics for a dev-only direct timeline artifact. */
export function directTimelineDiagnostics(
  content: unknown,
  project: VideoProject | undefined,
): DirectTimelineDiagnostics | undefined {
  if (!content || typeof content !== "object") return undefined;
  const record = content as Record<string, unknown>;
  const mode = record.mode;
  if (
    (mode !== "direct-timeline" && mode !== "direct-summary-timeline")
    || typeof record.name !== "string"
    || typeof record.visualIntent !== "string"
    || !project
  ) {
    return undefined;
  }

  const eventTypeCounts = {
    background: 0,
    text: 0,
    shape: 0,
    particle: 0,
  };
  project.events.forEach((event) => {
    eventTypeCounts[event.type] += 1;
  });

  return {
    mode,
    name: record.name,
    visualIntent: record.visualIntent,
    eventCount: project.events.length,
    eventTypeCounts,
    layers: [...new Set(project.events.map((event) => event.layer))].sort((a, b) => a - b),
    timelineStart: Math.min(...project.events.map((event) => event.start)),
    timelineEnd: Math.max(...project.events.map((event) => event.end)),
  };
}
