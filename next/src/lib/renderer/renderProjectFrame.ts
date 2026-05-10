import {
  drawBackground,
  fillFallbackBackground,
} from "@/lib/renderer/background";
import { drawShape } from "@/lib/renderer/shape";
import { drawText } from "@/lib/renderer/text";
import { visibleEvents } from "@/lib/renderer/visibleEvents";
import type { BackgroundEvent, TimelineEvent, VideoProject } from "@/lib/renderer/types";

function drawForegroundEvent(
  context: CanvasRenderingContext2D,
  event: Exclude<TimelineEvent, BackgroundEvent>,
  time: number,
) {
  if (event.type === "text") {
    drawText(context, event, time);
    return;
  }

  drawShape(context, event, time);
}

export function renderProjectFrame(
  context: CanvasRenderingContext2D,
  project: VideoProject,
  time: number,
) {
  context.clearRect(0, 0, project.width, project.height);

  const events = visibleEvents(project, time);
  const backgroundEvent = events.find((event) => event.type === "background");

  if (backgroundEvent) {
    drawBackground(context, backgroundEvent, project);
  } else {
    fillFallbackBackground(context, project);
  }

  for (const event of events) {
    if (event.type === "background") {
      continue;
    }

    drawForegroundEvent(context, event, time);
  }
}
