import {
  buildDirectSummaryProject,
  buildDirectTimelineProject,
  DIRECT_TIMELINE_HEIGHT,
  DIRECT_TIMELINE_WIDTH,
} from "@/lib/agent/videoParts/directTimeline";
import type { AuthoredVideoPart } from "@/lib/agent/videoParts/schemas";
import type { VideoPartTheme } from "@/lib/agent/videoParts/theme";
import { DEFAULT_PALETTE, PALETTES } from "@/lib/others/catalog/palettes";
import { seededHash } from "@/lib/others/timeline/utils";
import type { TimelineEvent, VideoProject } from "@/lib/ui/renderer";

function themedBackground(
  id: string,
  duration: number,
  theme: VideoPartTheme,
): TimelineEvent {
  const palette = PALETTES[theme.palette] ?? PALETTES[DEFAULT_PALETTE];
  return {
    id,
    type: "background",
    start: 0,
    end: duration,
    layer: 0,
    background: {
      kind: "gradient",
      from: palette.bgFrom,
      to: palette.bgTo,
      angle: palette.bgAngle,
    },
  };
}

function buildTitleEvents(
  content: Extract<AuthoredVideoPart, { part: "title" }>["content"],
  duration: number,
  theme: VideoPartTheme,
): TimelineEvent[] {
  const palette = PALETTES[theme.palette] ?? PALETTES[DEFAULT_PALETTE];
  const centered = theme.titleAlign === "center";
  const x = centered ? DIRECT_TIMELINE_WIDTH / 2 : 180;
  const align = centered ? "center" as const : "left" as const;
  const titleSize = theme.titleSize === "hero" ? 76 : 64;
  const events: TimelineEvent[] = [
    themedBackground("background", duration, theme),
    {
      id: "accent-line",
      type: "shape",
      shapeType: "line",
      start: 0,
      end: duration,
      layer: 3,
      x1: centered ? 610 : 180,
      y1: 430,
      x2: centered ? 1310 : 760,
      y2: 430,
      stroke: palette.accent1,
      lineWidth: 8,
      drawProgress: { from: 0, to: 1, easing: "easeOut" },
    },
    {
      id: "title",
      type: "text",
      start: 0,
      end: duration,
      layer: 8,
      text: content.title,
      x,
      y: 470,
      maxWidth: centered ? 1500 : 1450,
      color: palette.text,
      fontSize: titleSize,
      fontWeight: 800,
      align,
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 22, to: 0, easing: "easeOut" },
    },
  ];
  if (content.subtitle) {
    events.push({
      id: "subtitle",
      type: "text",
      start: Math.min(0.15, duration / 5),
      end: duration,
      layer: 8,
      text: content.subtitle,
      x,
      y: 590,
      maxWidth: centered ? 1300 : 1250,
      color: palette.muted,
      fontSize: 32,
      fontWeight: 600,
      align,
      opacity: { from: 0, to: 1, easing: "easeOut" },
    });
  }
  return events;
}

function buildConclusionEvents(
  content: Extract<AuthoredVideoPart, { part: "conclusion" }>["content"],
  duration: number,
  theme: VideoPartTheme,
): TimelineEvent[] {
  const palette = PALETTES[theme.palette] ?? PALETTES[DEFAULT_PALETTE];
  return [
    themedBackground("background", duration, theme),
    {
      id: "closing-ring",
      type: "shape",
      shapeType: "circle",
      start: 0,
      end: duration,
      layer: 2,
      x: DIRECT_TIMELINE_WIDTH / 2,
      y: DIRECT_TIMELINE_HEIGHT / 2,
      radius: 250,
      fill: "transparent",
      stroke: palette.accent2,
      strokeWidth: 5,
      opacity: { from: 0, to: 0.55, easing: "easeOut" },
      scale: { from: 0.75, to: 1, easing: "easeOut" },
    },
    {
      id: "closing-line",
      type: "text",
      start: 0,
      end: duration,
      layer: 8,
      text: content.closingLine,
      x: DIRECT_TIMELINE_WIDTH / 2,
      y: DIRECT_TIMELINE_HEIGHT / 2,
      maxWidth: 1320,
      color: palette.text,
      fontSize: 48,
      fontWeight: 800,
      align: "center",
      verticalAlign: "middle",
      opacity: { from: 0, to: 1, easing: "easeOut" },
      translateY: { from: 18, to: 0, easing: "easeOut" },
    },
  ];
}

export function buildStandaloneVideoPartProject(
  artifact: AuthoredVideoPart,
  duration: number,
  theme: VideoPartTheme,
): VideoProject {
  if (artifact.part === "summary") {
    return buildDirectSummaryProject(artifact.content, duration);
  }
  if (artifact.part === "main-diagram") {
    return buildDirectTimelineProject(artifact.content, duration);
  }

  const events = artifact.part === "title"
    ? buildTitleEvents(artifact.content, duration, theme)
    : buildConclusionEvents(artifact.content, duration, theme);
  const hash = seededHash(JSON.stringify({ artifact, duration, theme })).toString(16);
  return {
    id: `direct-${artifact.part}-${hash}`,
    name: artifact.part === "title" ? artifact.content.title : artifact.content.closingLine,
    width: DIRECT_TIMELINE_WIDTH,
    height: DIRECT_TIMELINE_HEIGHT,
    duration,
    events,
  };
}
