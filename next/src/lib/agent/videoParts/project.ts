import {
  buildProjectFromBriefSection,
  type BriefProjectSection,
} from "@/lib/agent/brief/buildProjectFromBrief";
import { validateBrief } from "@/lib/agent/brief/validateBrief";
import type { SupportedDuration, VideoBrief } from "@/lib/agent/schemas/brief";
import type {
  AuthoredVideoPart,
  MainDiagramPartContent,
} from "@/lib/agent/videoParts/schemas";
import type { VideoPartTheme } from "@/lib/agent/videoParts/theme";
import type { VideoProject } from "@/lib/ui/renderer";

function mainDiagramScene(content: MainDiagramPartContent) {
  if (content.diagramFamily === "graph-flow") {
    const mustShow = content.graph.nodes.map((node) => node.label).slice(0, 8);
    return {
      heading: content.heading,
      diagramScript: {
        summary: content.heading,
        beats: content.blocks.map((block) => block.heading).slice(0, 6),
        visualStory: `Show ${content.heading} as one connected graph flow.`,
        mustShow,
      },
      diagramIntent: {
        family: "graph-flow",
        subject: content.heading,
        signatureVisuals: mustShow,
        motionCues: content.graph.edges.filter((edge) => edge.animated).map((edge) => `${edge.from} to ${edge.to}`),
      },
      diagramLayout: content.diagramLayout,
      blocks: content.blocks,
      graph: content.graph,
      entryAnimation: "fade-only",
      blockStyle: "cards",
      emphasizeIndex: -1,
      transition: "none",
    };
  }

  const blocks = content.visualPrimitives.slice(0, 2).map((primitive) => ({
    heading: primitive.label,
    description: primitive.description ?? `Show the role of ${primitive.label}.`,
  }));
  return {
    heading: content.heading,
    diagramScript: content.diagramScript,
    diagramIntent: {
      family: content.diagramFamily,
      ...content.diagramIntent,
    },
    diagramLayout: "stack",
    blocks,
    visualPrimitives: content.visualPrimitives,
    primitiveRelationships: content.primitiveRelationships,
    storyboard: content.storyboard,
    entryAnimation: "fade-only",
    blockStyle: "timeline",
    emphasizeIndex: -1,
    transition: "none",
  };
}

function briefAndSection(
  artifact: AuthoredVideoPart,
  theme: VideoPartTheme,
): { brief: VideoBrief; section: BriefProjectSection } {
  const shared = { ...theme, palette: theme.palette, style: theme.style };

  switch (artifact.part) {
    case "title":
      return {
        brief: validateBrief({
          ...shared,
          title: artifact.content.title,
          subtitle: artifact.content.subtitle,
          closingStyle: "none",
          scenes: [],
        }),
        section: { kind: "title" },
      };
    case "summary":
      return {
        brief: validateBrief({
          ...shared,
          title: artifact.content.heading,
          closingStyle: "none",
          scenes: [{
            ...artifact.content,
            entryAnimation: "slide-up",
            blockStyle: "stacked",
            emphasizeIndex: -1,
            transition: "none",
          }],
        }),
        section: { kind: "scene", sourceIndex: 0, eventIndex: 0, sceneCount: 2 },
      };
    case "main-diagram":
      return {
        brief: validateBrief({
          ...shared,
          title: artifact.content.heading,
          closingStyle: "none",
          scenes: [mainDiagramScene(artifact.content)],
        }),
        section: { kind: "scene", sourceIndex: 0, eventIndex: 1, sceneCount: 2 },
      };
    case "conclusion":
      return {
        brief: validateBrief({
          ...shared,
          title: artifact.content.closingLine,
          closingLine: artifact.content.closingLine,
          closingStyle: theme.closingStyle ?? "fade-up",
          scenes: [],
        }),
        section: { kind: "closing" },
      };
  }
}

/** Converts a strict authored part into a valid brief section and renders it. */
export function buildStandaloneVideoPartProject(
  artifact: AuthoredVideoPart,
  duration: SupportedDuration,
  theme: VideoPartTheme,
): VideoProject {
  const adapted = briefAndSection(artifact, theme);
  return buildProjectFromBriefSection(adapted.brief, duration, adapted.section);
}
