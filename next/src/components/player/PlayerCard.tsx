"use client";

import { PlayerCanvas } from "@/components/canvas";
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
  const {
    currentTime,
    project,
    playerRef,
    isFullscreen,
    togglePlayback,
    scrubTo,
    toggleFullscreen,
  } = usePlayerContext();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent keyboard shortcuts when user is focusing input textareas
    const active = document.activeElement;
    if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) {
      return;
    }

    switch (e.key) {
      case " ":
        e.preventDefault();
        togglePlayback();
        break;
      case "ArrowLeft":
        e.preventDefault();
        scrubTo(Math.max(0, currentTime - 1.5));
        break;
      case "ArrowRight":
        e.preventDefault();
        scrubTo(Math.min(project.duration, currentTime + 1.5));
        break;
      case "f":
      case "F":
        e.preventDefault();
        toggleFullscreen();
        break;
    }
  };

  return (
    <div
      ref={playerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className={`card overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-primary/40 ${isFullscreen ? "fixed inset-0 z-50 w-screen! h-screen flex flex-col justify-between bg-[#030914] p-6 rounded-none border-none" : ""
        }`}
    >
      <div className={`border-b border-border/80 px-5 py-4 ${isFullscreen ? "bg-[#061020]/50 rounded-xl mb-4" : ""}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-foreground">{project.name}</p>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mt-0.5">
              {isFullscreen ? "Fullscreen mode" : "Inline preview"}
            </p>
          </div>
          <span className="text-sm font-mono text-muted-foreground">
            {formatSeconds(currentTime)} / {formatSeconds(project.duration)}
          </span>
        </div>
      </div>

      <div className={`flex-1 flex items-center justify-center bg-black/25 rounded-2xl overflow-hidden ${isFullscreen ? "mb-4" : ""}`}>
        <PlayerCanvas
          project={project}
          currentTime={currentTime}
          className={
            isFullscreen
              ? "max-h-[68vh] max-w-full w-auto h-auto object-contain rounded-xl border border-border/20 bg-black/45 shadow-2xl"
              : undefined
          }
        />
      </div>
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
