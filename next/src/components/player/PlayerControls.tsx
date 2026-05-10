"use client";

import { usePlayerContext } from "@/components/player/PlayerProvider";

export function PlayerControls() {
  const { currentTime, isPlaying, project, scrubTo, togglePlayback } =
    usePlayerContext();

  return (
    <div className="flex items-center gap-3 border-t border-border px-4 py-3">
      <button
        type="button"
        className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        onClick={togglePlayback}
      >
        {isPlaying
          ? "Pause"
          : currentTime >= project.duration
            ? "Replay"
            : "Play"}
      </button>
      <input
        type="range"
        min={0}
        max={project.duration}
        step={0.01}
        value={currentTime}
        className="w-full accent-primary"
        onChange={(event) => {
          scrubTo(Number(event.target.value));
        }}
      />
    </div>
  );
}
