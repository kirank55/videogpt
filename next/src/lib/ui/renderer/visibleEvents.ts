import type { VideoProject } from "@/lib/ui/renderer/types";

export function visibleEvents(project: VideoProject, time: number) {
  return project.events
    .filter((event) => time >= event.start && time <= event.end)
    .sort((left, right) => left.layer - right.layer);
}
