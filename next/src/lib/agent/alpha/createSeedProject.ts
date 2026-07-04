import { buildProjectFromBrief } from "@/lib/agent/brief/buildProjectFromBrief";
import { resolveDuration, type VideoBrief } from "@/lib/agent/schemas/brief";
import type { VideoProject } from "@/lib/ui/renderer";

export function createSeedProject(name: string, duration: number): VideoProject {
  const safeDuration = resolveDuration(duration);
  const brief: VideoBrief = {
    title: name,
    subtitle: "Generated with VideoGPT",
    closingLine: "Ready to iterate.",
    palette: "midnight",
    style: "modern",
    particleIntensity: 1,
    scenes: [
      {
        heading: "Prompt to Timeline",
        diagramLayout: "pipeline",
        blocks: [
          { heading: "Prompt", description: "A user asks for a visual explanation.", icon: "browser" },
          { heading: "Brief", description: "The AI writes a structured scene brief.", icon: "code" },
          { heading: "Render", description: "The expander turns it into animated events.", icon: "app" },
        ],
        graph: {
          nodes: [
            { id: "prompt", label: "Prompt", icon: "browser" },
            { id: "brief", label: "Scene Brief", icon: "code" },
            { id: "timeline", label: "Timeline", icon: "app" },
          ],
          edges: [
            { from: "prompt", to: "brief", label: "author", animated: true },
            { from: "brief", to: "timeline", label: "expand", animated: true },
          ],
        },
        entryAnimation: "slide-up",
        blockStyle: "cards",
        transition: "fade",
      },
    ],
  };

  return buildProjectFromBrief(brief, safeDuration);
}
