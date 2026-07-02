"use client";

import { useState, useEffect, useRef } from "react";
import { FabricCanvas } from "@/components/canvas";
import { PlayerControls } from "@/components/player/PlayerControls";
import type { VideoProject } from "@/lib/ui/renderer";
import { renderProjectFrame } from "@/lib/ui/renderer";
import { useRouter } from "next/navigation";
import {
  PlayerProvider,
  usePlayerContext,
} from "@/components/player/PlayerProvider";
import { useStore } from "@/lib/ui/store";
import { TIMINGS } from "@/lib/others/catalog/timings";
import { resolveActTimings } from "@/lib/agent/brief/briefHelpers";

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
    isEditMode,
    toggleEditMode,
    applyEdits,
  } = usePlayerContext();

  // Load visual check states from Zustand store
  const session = useStore((s) =>
    s.sessions.find((sess) => sess.id === sessionId),
  );
  const message = session?.messages.find((m) => m.id === messageId);
  const runVisualCheck = useStore((s) => s.runVisualCheck);

  const visualCheck = message?.visualCheck;
  const visualCheckLoading = message?.visualCheckLoading;

  const handleVisualCheck = async () => {
    if (!project || !sessionId || !messageId) return;

    const duration = project.duration;
    const baseTiming = TIMINGS[duration as keyof typeof TIMINGS] || TIMINGS[5];
    const resolvedTiming = resolveActTimings(
      baseTiming,
      duration,
      message?.brief?.actWeights,
    );

    const timestamps = [
      resolvedTiming.act1.end,
      resolvedTiming.act2.end,
      resolvedTiming.act3.end,
      resolvedTiming.act4.end,
      resolvedTiming.act5.end,
    ];

    const frames = [];
    const canvas = document.createElement("canvas");
    canvas.width = project.width || 1920;
    canvas.height = project.height || 1080;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      for (let i = 0; i < timestamps.length; i++) {
        const time = timestamps[i];
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        renderProjectFrame(ctx, project, time);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        frames.push({
          actIndex: i + 1,
          timestamp: time,
          dataUrl,
        });
      }
    }

    await runVisualCheck(sessionId, messageId, frames);
  };

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
      {visualCheckLoading && (
        <div className="border-t border-border/85 p-4 bg-amber-500/5 flex items-center gap-3 animate-pulse text-xs">
          <div className="size-4 rounded-full border-2 border-amber-500/20 border-t-amber-500 animate-spin" />
          <span className="font-semibold text-amber-700 dark:text-amber-400">
            Vision LLM is checking frame layouts, overlaps & readability...
          </span>
        </div>
      )}
      {!isFullscreen && visualCheck && (
        <VisualCheckReport
          project={project}
          visualCheck={visualCheck}
          scrubTo={scrubTo}
        />
      )}
    </div>
  );
}

function ActThumbnail({
  project,
  time,
  onClick,
  active,
}: {
  project: any;
  time: number;
  onClick: () => void;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !project) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderProjectFrame(ctx, project, time);
  }, [project, time]);

  return (
    <div
      onClick={onClick}
      className={`group flex flex-col gap-1 p-1 rounded-lg border text-left transition-all cursor-pointer select-none ${
        active
          ? "border-amber-500 bg-amber-500/5 font-semibold"
          : "border-border hover:border-foreground/30 hover:bg-foreground/5"
      }`}
    >
      <span className="text-[9px] font-mono text-muted-foreground group-hover:text-foreground">
        {time.toFixed(1)}s
      </span>
      <div className="aspect-video w-full rounded overflow-hidden border border-border/40 bg-black/10">
        <canvas
          ref={canvasRef}
          width={480}
          height={270}
          className="w-full h-full object-cover pointer-events-none"
        />
      </div>
    </div>
  );
}

function VisualCheckReport({
  project,
  visualCheck,
  scrubTo,
}: {
  project: any;
  visualCheck: any;
  scrubTo: (time: number) => void;
}) {
  const [selectedActIndex, setSelectedActIndex] = useState(0);

  if (!visualCheck || !visualCheck.frames || visualCheck.frames.length === 0)
    return null;

  const currentFrame =
    visualCheck.frames[selectedActIndex] || visualCheck.frames[0];

  return (
    <div className="border-t border-border/80 px-5 py-4 bg-surface-raised/30 flex flex-col gap-4 text-xs">
      <div className="flex items-center justify-between gap-4">
        <div>
          <span className="font-bold text-foreground">Visual LLM Check</span>
          <p className="text-muted-foreground mt-0.5 text-[11px]">
            {visualCheck.summary}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              visualCheck.passed
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
            }`}
          >
            {visualCheck.passed ? "PASSED" : "FAILED"}
          </span>
          <span className="font-mono font-bold text-foreground/80">
            Score: {visualCheck.score}/100
          </span>
        </div>
      </div>

      {/* Acts Grid */}
      <div className="grid grid-cols-5 gap-2">
        {visualCheck.frames.map((f: any, idx: number) => (
          <ActThumbnail
            key={idx}
            project={project}
            time={f.timestamp}
            active={selectedActIndex === idx}
            onClick={() => {
              setSelectedActIndex(idx);
              scrubTo(f.timestamp);
            }}
          />
        ))}
      </div>

      {/* Selected Act Feedback */}
      <div className="p-3 rounded-xl border border-border/80 bg-background/50 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-foreground/90">
            Act {currentFrame.actIndex} Details (
            {currentFrame.timestamp.toFixed(1)}s)
          </span>
          <span className="font-mono text-muted-foreground">
            Frame Score: {currentFrame.score}/100
          </span>
        </div>
        <p className="text-muted-foreground">{currentFrame.feedback}</p>
        {currentFrame.issues && currentFrame.issues.length > 0 ? (
          <div className="space-y-1.5 pt-1">
            {currentFrame.issues.map((issue: any, idx: number) => (
              <div key={idx} className="flex items-start gap-2 text-[11px]">
                <span
                  className={`mt-0.5 shrink-0 px-1 py-0.25 rounded text-[8px] font-bold uppercase tracking-wider ${
                    issue.severity === "error"
                      ? "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                      : "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                  }`}
                >
                  {issue.severity}
                </span>
                <span className="text-foreground/80">{issue.description}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
                clipRule="evenodd"
              />
            </svg>
            No visual issues detected in this frame.
          </div>
        )}
      </div>

      {/* Recommendations */}
      {visualCheck.recommendations &&
        visualCheck.recommendations.length > 0 && (
          <div className="space-y-1.5">
            <span className="font-bold text-foreground/80">
              Recommendations
            </span>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground text-[11px]">
              {visualCheck.recommendations.map((rec: string, idx: number) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
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
            <p className="text-sm font-bold text-foreground animate-pulse">
              Generating Video...
            </p>
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
          <p className="text-sm font-bold text-foreground">
            {statuses[statusIdx]}
          </p>
          <p className="text-xs text-muted-foreground">
            VideoGPT is sketching your scene layout
          </p>
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
    return <PlayerLoadingCard />;
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
