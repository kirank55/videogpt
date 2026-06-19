"use client";

import { useState, useEffect } from "react";
import { PlayerCanvas } from "@/components/canvas";
import { PlayerControls } from "@/components/player/PlayerControls";
import type { VideoProject } from "@/lib/renderer";
import { useRouter } from "next/navigation";
import {
  PlayerProvider,
  usePlayerContext,
} from "@/components/player/PlayerProvider";

type PlayerCardProps = {
  project: VideoProject;
  autoPlay?: boolean;
  initialTime?: number;
  showControls?: boolean;
  sessionId?: string;
  messageId?: string;
};

function formatSeconds(value: number) {
  return `${value.toFixed(1)}s`;
}

type PlayerCardFrameProps = {
  showControls: boolean;
  sessionId?: string;
  messageId?: string;
};

function PlayerCardFrame({
  showControls,
  sessionId,
  messageId,
}: PlayerCardFrameProps) {
  const router = useRouter();
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
      className={`card overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${isFullscreen ? "dark fixed inset-0 z-50 w-screen! h-screen flex flex-col justify-between bg-zinc-950 p-6 rounded-none border-none" : ""
        }`}
    >
      <div className={`border-b border-border/80 px-5 py-4 ${isFullscreen ? "bg-zinc-900/50 rounded-xl mb-4" : ""}`}>
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-foreground">{project.name}</p>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mt-0.5">
              {isFullscreen ? "Fullscreen mode" : "Inline preview"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-muted-foreground">
              {formatSeconds(currentTime)} / {formatSeconds(project.duration)}
            </span>
            {sessionId && messageId && (
              <button
                type="button"
                onClick={() => router.push(`/advance?sessionId=${sessionId}&messageId=${messageId}`)}
                className="rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-all duration-150 active:scale-95 cursor-pointer"
              >
                Advanced Mode
              </button>
            )}
          </div>
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

type PlayerCardProps = {
  project?: VideoProject;
  isLoading?: boolean;
  autoPlay?: boolean;
  initialTime?: number;
  showControls?: boolean;
  sessionId?: string;
  messageId?: string;
};

function PlayerLoadingCard() {
  const [statusIdx, setStatusIdx] = useState(0);
  const statuses = [
    "Sending prompt to server...",
    "Generating video script (LLM)...",
    "Building scene timeline...",
    "Rendering video frames...",
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStatusIdx((prev) => {
        if (prev < statuses.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="card overflow-hidden transition-all bg-surface-raised flex flex-col">
      {/* Header Bar */}
      <div className="border-b border-border/80 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-foreground animate-pulse">Generating Video...</p>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mt-0.5 animate-pulse">
              Please wait
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground animate-pulse">
              -- / --
            </span>
          </div>
        </div>
      </div>

      {/* Main Preview Container */}
      <div className="aspect-video flex flex-col items-center justify-center bg-black/15 dark:bg-black/35 rounded-2xl overflow-hidden m-4 min-h-[300px] gap-4 p-6 text-center border border-dashed border-border/40">
        <div className="relative flex items-center justify-center">
          {/* Spinner rings */}
          <div className="size-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-bold text-foreground">{statuses[statusIdx]}</p>
          <p className="text-xs text-muted-foreground">VideoGPT is sketching your scene layout</p>
        </div>
      </div>

      {/* Control buttons row in skeleton/disabled state */}
      <div className="border-t border-border px-5 py-4 bg-surface/30 backdrop-blur-md flex flex-col gap-3.5 opacity-50 select-none pointer-events-none">
        {/* Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-border/40" />

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="p-1.5 rounded-lg text-muted-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
              </svg>
            </div>
            <span className="text-xs font-mono text-muted-foreground">0.0s / 0.0s</span>
          </div>
          <div className="flex gap-2">
            <div className="px-2.5 py-1 text-xs font-bold rounded-lg border border-border text-muted-foreground">1.0x</div>
            <div className="px-3 py-1 text-xs font-semibold rounded-lg border border-border text-muted-foreground">Export</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlayerCard({
  project,
  isLoading = false,
  autoPlay = true,
  initialTime = 0,
  showControls = false,
  sessionId,
  messageId,
}: PlayerCardProps) {
  if (isLoading || !project) {
    return <PlayerLoadingCard />;
  }

  return (
    <PlayerProvider
      project={project}
      autoPlay={autoPlay}
      initialTime={initialTime}
    >
      <PlayerCardFrame showControls={showControls} sessionId={sessionId} messageId={messageId} />
    </PlayerProvider>
  );
}
