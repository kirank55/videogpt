import { resolveDuration } from "@/lib/others/schemas/duration";
import type { VideoProject } from "@/lib/ui/renderer";

export function createSeedProject(name: string, duration: number): VideoProject {
  const safeDuration = resolveDuration(duration);
  return {
    id: `seed-${safeDuration}`,
    name,
    width: 1920,
    height: 1080,
    duration: safeDuration,
    events: [
      {
        id: "background",
        type: "background",
        start: 0,
        end: safeDuration,
        layer: 0,
        background: { kind: "gradient", from: "#010a15", to: "#061020", angle: 150 },
      },
      {
        id: "title",
        type: "text",
        start: 0,
        end: safeDuration,
        layer: 8,
        text: name,
        x: 960,
        y: 430,
        maxWidth: 1500,
        color: "#f8fafc",
        fontSize: 68,
        fontWeight: 800,
        align: "center",
        opacity: { from: 0, to: 1, easing: "easeOut" },
      },
      {
        id: "direct-timeline",
        type: "text",
        start: 0.2,
        end: safeDuration,
        layer: 8,
        text: "Prompt to direct animated timeline",
        x: 960,
        y: 550,
        maxWidth: 1100,
        color: "rgb(148 163 184 / 0.85)",
        fontSize: 32,
        fontWeight: 600,
        align: "center",
        opacity: { from: 0, to: 1, easing: "easeOut" },
      },
    ],
  };
}
