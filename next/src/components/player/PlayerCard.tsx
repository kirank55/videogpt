"use client";

import { PlayerCanvas } from "@/components/player/PlayerCanvas";
import { PlayerControls } from "@/components/player/PlayerControls";
import type { VideoProject } from "@/lib/renderer";
import {
  PlayerProvider,
  usePlayerContext,
} from "@/components/player/PlayerProvider";

type PlayerCardProps = {
  project: VideoProject;
  autoPlay?: boolean;
  initialTime?: number;
  showControls?: boolean;
};

function formatSeconds(value: number) {
  return `${value.toFixed(1)}s`;
}

type PlayerCardFrameProps = {
  showControls: boolean;
};

function PlayerCardFrame({
  showControls,
}: PlayerCardFrameProps) {
  const { currentTime, project } = usePlayerContext();

  return (
    <div className="card overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">{project.name}</p>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              Inline preview
            </p>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatSeconds(currentTime)} / {formatSeconds(project.duration)}
          </span>
        </div>
      </div>

      <PlayerCanvas />
      {showControls ? <PlayerControls /> : null}
    </div>
  );
}

export function PlayerCard({
  project,
  autoPlay = true,
  initialTime = 0,
  showControls = false,
}: PlayerCardProps) {
  return (
    <PlayerProvider
      project={project}
      autoPlay={autoPlay}
      initialTime={initialTime}
    >
      <PlayerCardFrame showControls={showControls} />
    </PlayerProvider>
  );
}
