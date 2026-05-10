import type { BackgroundEvent, VideoProject } from "@/lib/renderer/types";

export function fillFallbackBackground(
  context: CanvasRenderingContext2D,
  project: VideoProject,
) {
  context.fillStyle = "#020617";
  context.fillRect(0, 0, project.width, project.height);
}

function createBackgroundFill(
  context: CanvasRenderingContext2D,
  event: BackgroundEvent,
  project: VideoProject,
) {
  if (event.background.kind === "solid") {
    return event.background.color;
  }

  const radians = (event.background.angle * Math.PI) / 180;
  const x = Math.cos(radians) * project.width;
  const y = Math.sin(radians) * project.height;
  const gradient = context.createLinearGradient(0, 0, x, y);
  gradient.addColorStop(0, event.background.from);
  gradient.addColorStop(1, event.background.to);
  return gradient;
}

function createVignette(
  context: CanvasRenderingContext2D,
  project: VideoProject,
) {
  const vignette = context.createRadialGradient(
    project.width / 2,
    project.height / 2,
    project.width * 0.15,
    project.width / 2,
    project.height / 2,
    project.width * 0.72,
  );
  vignette.addColorStop(0, "rgb(15 23 42 / 0)");
  vignette.addColorStop(1, "rgb(2 6 23 / 0.42)");
  return vignette;
}

export function drawBackground(
  context: CanvasRenderingContext2D,
  event: BackgroundEvent,
  project: VideoProject,
) {
  context.fillStyle = createBackgroundFill(context, event, project);
  context.fillRect(0, 0, project.width, project.height);

  context.fillStyle = createVignette(context, project);
  context.fillRect(0, 0, project.width, project.height);
}
