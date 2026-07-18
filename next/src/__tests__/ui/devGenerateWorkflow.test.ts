import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DevConclusionGeneratePage from "@/app/dev/generate/conclusion/page";
import DevMainDiagramGeneratePage from "@/app/dev/generate/main-diagram/page";
import DevSummaryGeneratePage from "@/app/dev/generate/summary/page";
import DevTitleGeneratePage from "@/app/dev/generate/title/page";
import { VideoPartGeneratePage } from "@/components/dev/VideoPartGeneratePage";
import type {
  GenerateVideoPartResponse,
  VideoPartKind,
} from "@/lib/agent/videoParts/schemas";
import { generateAndSaveDevVideoPart } from "@/lib/ui/generateDevVideoPart";
import type { VideoProject } from "@/lib/ui/renderer";

function generatedPart(part: VideoPartKind): GenerateVideoPartResponse {
  const project: VideoProject = {
    id: `${part}-project`,
    name: `${part} preview`,
    width: 1920,
    height: 1080,
    duration: 5,
    events: [{
      id: "background",
      type: "background",
      start: 0,
      end: 5,
      layer: 0,
      background: { kind: "solid", color: "#07111f" },
    }],
  };

  switch (part) {
    case "title":
      return { part, content: { title: "Solar Power" }, project };
    case "summary":
      return {
        part,
        content: {
          mode: "direct-summary-timeline",
          name: "Overview",
          visualIntent: "Show the energy flow.",
          events: project.events,
        },
        project,
      };
    case "main-diagram":
      return {
        part,
        content: {
          mode: "direct-timeline",
          name: "Mechanism",
          visualIntent: "Show the energy conversion mechanism.",
          events: project.events,
        },
        project,
      };
    case "conclusion":
      return { part, content: { closingLine: "Light becomes current." }, project };
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dev generation page workflow characterization", () => {
  it.each([
    ["title", DevTitleGeneratePage],
    ["summary", DevSummaryGeneratePage],
    ["main-diagram", DevMainDiagramGeneratePage],
    ["conclusion", DevConclusionGeneratePage],
  ] as const)("renders the %s route with its matching generation part", (part, Page) => {
    const element = Page() as ReactElement<{ part: VideoPartKind }>;

    expect(element.type).toBe(VideoPartGeneratePage);
    expect(element.props.part).toBe(part);
  });

  it.each(["title", "summary", "main-diagram", "conclusion"] as const)(
    "submits and stores the generated $part project for player rendering",
    async (part) => {
      let stored = "[]";
      vi.stubGlobal("window", {
        localStorage: {
          getItem: () => stored,
          setItem: (_key: string, value: string) => {
            stored = value;
          },
        },
      });
      const generated = generatedPart(part);
      const requester = vi.fn().mockResolvedValue(new Response(
        JSON.stringify(generated),
        { status: 200 },
      ));

      const result = await generateAndSaveDevVideoPart({
        part,
        prompt: "Explain how solar power works",
        duration: 5,
      }, requester);

      expect(requester).toHaveBeenCalledWith("/api/dev/generate-part", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          part,
          prompt: "Explain how solar power works",
          duration: 5,
        }),
      });
      expect(result).toEqual(generated);
      expect(JSON.parse(stored)).toEqual([
        expect.objectContaining({
          id: `${part}-${part}-project`,
          part,
          prompt: "Explain how solar power works",
          project: generated.project,
          content: generated.content,
        }),
      ]);
    },
  );
});
