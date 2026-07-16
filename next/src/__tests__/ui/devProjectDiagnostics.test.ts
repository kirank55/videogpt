import { describe, expect, it } from "vitest";
import { directTimelineDiagnostics } from "@/lib/ui/devProjectDiagnostics";
import type { VideoProject } from "@/lib/ui/renderer";

describe("dev project diagnostics", () => {
  it("describes direct LLM-authored timeline content without calling it a graph", () => {
    const project: VideoProject = {
      id: "direct-main",
      name: "Electric field",
      width: 1920,
      height: 1080,
      duration: 10,
      events: [
        {
          id: "bg",
          type: "background",
          start: 0,
          end: 10,
          layer: 0,
          background: { kind: "solid", color: "#000" },
        },
        {
          id: "label",
          type: "text",
          start: 0.2,
          end: 10,
          layer: 7,
          text: "Electric field",
          x: 100,
          y: 100,
          maxWidth: 900,
          color: "#fff",
          fontSize: 48,
        },
        {
          id: "shape",
          type: "shape",
          shapeType: "circle",
          start: 0.5,
          end: 10,
          layer: 3,
          x: 960,
          y: 540,
          radius: 80,
          fill: "#0ea5e9",
        },
      ],
    };

    expect(directTimelineDiagnostics({
      mode: "direct-timeline",
      name: "Charge separation",
      visualIntent: "Show the junction field separating charge carriers.",
      events: project.events,
    }, project)).toEqual({
      mode: "direct-timeline",
      name: "Charge separation",
      visualIntent: "Show the junction field separating charge carriers.",
      eventCount: 3,
      eventTypeCounts: { background: 1, text: 1, shape: 1, particle: 0 },
      layers: [0, 3, 7],
      timelineStart: 0,
      timelineEnd: 10,
    });
  });

  it("returns undefined for unsupported authored content", () => {
    expect(directTimelineDiagnostics({ title: "Unsupported", scenes: [] }, undefined)).toBeUndefined();
  });
});
