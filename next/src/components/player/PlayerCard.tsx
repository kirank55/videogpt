"use client";

import { FabricCanvas } from "@/components/canvas";
import { PlayerControls } from "@/components/player/PlayerControls";
import { StreamingProgress } from "@/components/StreamingProgress";
import type { VideoProject } from "@/lib/ui/renderer";
import {
  PlayerProvider,
  usePlayerContext,
} from "@/components/player/PlayerProvider";

type PlayerCardFrameProps = {
  showControls: boolean;
  sessionId?: string;
  messageId?: string;
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
    isEditMode,
    toggleEditMode,
    applyEdits,
  } = usePlayerContext();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent keyboard shortcuts when user is focusing input textareas
    const active = document.activeElement;
    if (
      active &&
      (active.tagName === "INPUT" || active.tagName === "TEXTAREA")
    ) {
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
      className={`card relative transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 ${
        isFullscreen
          ? "dark fixed inset-0 z-50 w-screen! h-screen flex flex-col justify-between bg-zinc-950 p-6 rounded-none border-none"
          : "overflow-visible"
      }`}
    >
      {isFullscreen && (
      <div
        className={`border-b border-border/80 px-5 py-4 ${isFullscreen ? "bg-zinc-900/50 rounded-xl mb-4" : ""}`}
      >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mt-0.5">
                Fullscreen mode
              </p>
            </div>
          </div>

      </div>
        )}
      <div
        className={`flex-1 flex items-center justify-center bg-black/25 rounded-2xl ${isEditMode && !isFullscreen ? "overflow-visible" : "overflow-hidden"} ${isFullscreen ? "mb-4" : ""}`}
      >
        <FabricCanvas
          project={project}
          currentTime={currentTime}
          editable={isEditMode}
          onEventsChange={applyEdits}
          onDone={toggleEditMode}
          isFullscreen={isFullscreen}
          className={isFullscreen ? "w-full h-full" : "w-full"}
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

function PlayerLoadingCard({ sessionId }: { sessionId?: string }) {
  return (
    <div className="card overflow-hidden transition-all bg-surface-raised flex flex-col">
      {/* Header Bar */}
      <div className="border-b border-border/80 px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-foreground animate-pulse">
              Generating video...
            </p>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mt-0.5 animate-pulse">
              Please wait
            </p>
          </div>
          <span className="text-xs font-mono text-muted-foreground animate-pulse">
            -- / --
          </span>
        </div>
      </div>

      {/* Main Preview Container — same streaming progress as the chat bubble */}
      <div className="aspect-video flex flex-col items-center justify-center bg-black/15 dark:bg-black/35 rounded-2xl overflow-hidden m-4 min-h-[300px] gap-4 p-6 text-center border border-dashed border-border/40">
        <div className="size-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
        <div className="w-full max-w-md">
          <StreamingProgress sessionId={sessionId} showSpinner={false} />
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path
                  fillRule="evenodd"
                  d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              0.0s / 0.0s
            </span>
          </div>
          <div className="flex gap-2">
            <div className="px-2.5 py-1 text-xs font-bold rounded-lg border border-border text-muted-foreground">
              1.0x
            </div>
            <div className="px-3 py-1 text-xs font-semibold rounded-lg border border-border text-muted-foreground">
              Export
            </div>
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
    return <PlayerLoadingCard sessionId={sessionId} />;
  }

  return (
    <PlayerProvider
      project={project}
      autoPlay={autoPlay}
      initialTime={initialTime}
    >
      <PlayerCardFrame
        showControls={showControls}
        sessionId={sessionId}
        messageId={messageId}
      />
    </PlayerProvider>
  );
}
