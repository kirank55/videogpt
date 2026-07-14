import {
  buildProjectFromBriefSection,
  type BriefProjectSection,
  type ScenePresentation,
} from "@/lib/agent/brief/buildProjectFromBrief";
import { validateBrief } from "@/lib/agent/brief/validateBrief";
import type { Scene, SupportedDuration, VideoBrief } from "@/lib/agent/schemas/brief";
import type {
  AuthoredVideoPart,
  MainDiagramPartContent,
  SummaryPartContent,
} from "@/lib/agent/videoParts/schemas";
import type { VideoPartTheme } from "@/lib/agent/videoParts/theme";
import type { VideoProject } from "@/lib/ui/renderer";

type SummarySceneInput = Pick<
  Scene,
  | "heading"
  | "diagramScript"
  | "diagramIntent"
  | "diagramLayout"
  | "blocks"
  | "entryAnimation"
  | "blockStyle"
  | "emphasizeIndex"
  | "transition"
> & Partial<Pick<
  Scene,
  "graph" | "visualPrimitives" | "primitiveRelationships" | "storyboard"
>>;

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

/** Adapts strict Summary authorship into a reusable renderer scene. */
export function summaryPartScene(content: SummaryPartContent): {
  scene: SummarySceneInput;
  presentation: ScenePresentation;
} {
  if (content.diagramFamily === "graph-flow") {
    const signatureVisuals = content.graph.nodes.map((node) => node.label).slice(0, 8);
    return {
      presentation: "compact-context",
      scene: {
        heading: content.heading,
        diagramScript: {
          summary: content.heading,
          beats: content.blocks.map((block) => block.heading),
          visualStory: `Introduce ${content.heading} as a compact connected context graph.`,
          mustShow: signatureVisuals,
        },
        diagramIntent: {
          family: "graph-flow" as const,
          subject: content.heading,
          signatureVisuals,
          motionCues: content.graph.edges
            .filter((edge) => edge.animated)
            .map((edge) => `${edge.from} to ${edge.to}`),
        },
        diagramLayout: content.diagramLayout,
        blocks: content.blocks,
        graph: content.graph,
        entryAnimation: "slide-up" as const,
        blockStyle: "stacked" as const,
        emphasizeIndex: -1,
        transition: "none" as const,
      },
    };
  }

  const signatureVisuals = content.visualPrimitives.map((primitive) => primitive.label);
  return {
    presentation: "compact-storyboard",
    scene: {
      heading: content.heading,
      diagramScript: {
        summary: content.heading,
        beats: content.storyboard.stages.map((stage) => stage.label),
        visualStory: `Introduce ${content.heading} with a compact ${content.diagramFamily} drawing.`,
        mustShow: signatureVisuals,
      },
      diagramIntent: {
        family: content.diagramFamily,
        subject: content.heading,
        signatureVisuals,
        motionCues: content.primitiveRelationships
          .map((relationship) => relationship.motion ?? relationship.relation),
      },
      diagramLayout: "stack" as const,
      blocks: content.blocks,
      visualPrimitives: content.visualPrimitives,
      primitiveRelationships: content.primitiveRelationships,
      storyboard: content.storyboard,
      entryAnimation: "slide-up" as const,
      blockStyle: "stacked" as const,
      emphasizeIndex: -1,
      transition: "none" as const,
    },
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
    case "summary": {
      const adaptedSummary = summaryPartScene(artifact.content);
      return {
        brief: validateBrief({
          ...shared,
          title: artifact.content.heading,
          closingStyle: "none",
          scenes: [adaptedSummary.scene],
        }),
        section: {
          kind: "scene",
          sourceIndex: 0,
          eventIndex: 0,
          sceneCount: 2,
          presentation: adaptedSummary.presentation,
        },
      };
    }
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
