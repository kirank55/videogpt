"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayerContext } from "@/components/player/PlayerProvider";

import type { VideoProject } from "@/lib/ui/renderer";

type Chapter = {
  name: string;
  time: number;
};

function getChapters(project: VideoProject): Chapter[] {
  const chapters: Chapter[] = [];
  const events = [...(project.events || [])].sort((a, b) => a.start - b.start);

  const titleEvent = events.find(e => e.id === "title" || e.id === "intro-title");
  if (titleEvent) {
    chapters.push({ name: "Title", time: titleEvent.start });
  } else {
    chapters.push({ name: "Title", time: 0 });
  }

  const clientEvent = events.find(e => e.id === "client-header" || e.id === "client-rect" || e.id?.includes("browser"));
  if (clientEvent) {
    chapters.push({ name: "Client Setup", time: clientEvent.start });
  }

  const reqEvent = events.find(e => e.id === "req-label" || e.id === "req-packet" || e.id?.includes("request") || e.id?.includes("req"));
  if (reqEvent) {
    chapters.push({ name: "Request Flow", time: reqEvent.start });
  }

  const procEvent = events.find(e => e.id === "processing-glow" || e.id?.includes("processing") || e.id?.includes("logic") || e.id?.includes("api"));
  if (procEvent) {
    if (!chapters.some(c => Math.abs(c.time - procEvent.start) < 0.5)) {
      chapters.push({ name: "Processing", time: procEvent.start });
    }
  }

  const resEvent = events.find(e => e.id === "res-label" || e.id === "res-packet" || e.id?.includes("response") || e.id?.includes("res"));
  if (resEvent) {
    if (!chapters.some(c => Math.abs(c.time - resEvent.start) < 0.5)) {
      chapters.push({ name: "Response Flow", time: resEvent.start });
    }
  }

  const outroEvent = events.find(e => e.id === "closing-line" || e.id === "outro-separator" || e.id?.includes("outro") || e.id?.includes("closing"));
  if (outroEvent) {
    if (!chapters.some(c => Math.abs(c.time - outroEvent.start) < 0.5)) {
      chapters.push({ name: "Conclusion", time: outroEvent.start });
    }
  }

  const uniqueChapters = chapters
    .filter((v, i, a) => a.findIndex(t => t.name === v.name) === i)
    .sort((a, b) => a.time - b.time);

  if (uniqueChapters.length <= 1) {
    const d = project.duration || 15;
    return [
      { name: "Start", time: 0 },
      { name: "Setup", time: d * 0.2 },
      { name: "Flow", time: d * 0.5 },
      { name: "Outro", time: d * 0.8 },
    ];
  }

  if (uniqueChapters.length > 0 && uniqueChapters[0].time > 0) {
    uniqueChapters.unshift({ name: "Start", time: 0 });
  }

  return uniqueChapters;
}

function getChapterAtTime(time: number, chapters: Chapter[]) {
  let activeChapter = chapters[0]?.name || "Intro";
  for (const ch of chapters) {
    if (time >= ch.time) {
      activeChapter = ch.name;
    } else {
      break;
    }
  }
  return activeChapter;
}

export function PlayerControls() {
  const {
    currentTime,
    isPlaying,
    project,
    speed,
    setSpeed,
    scrubTo,
    togglePlayback,
    isFullscreen,
    toggleFullscreen,
    isExporting,
    exportProgress,
    startExport,
  } = usePlayerContext();

  const trackRef = useRef<HTMLDivElement | null>(null);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number>(0);
  const [hoverX, setHoverX] = useState<number>(0);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showExportMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showExportMenu]);

  const chapters = getChapters(project);
  const currentChapter = getChapterAtTime(currentTime, chapters);
  const hoverChapter = getChapterAtTime(hoverTime, chapters);

  const handleTrackClickOrDrag = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    scrubTo(percentage * project.duration);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    handleTrackClickOrDrag(e.clientX);
    const handleMouseMoveGlobal = (moveEvent: MouseEvent) => {
      handleTrackClickOrDrag(moveEvent.clientX);
    };
    const handleMouseUpGlobal = () => {
      document.removeEventListener("mousemove", handleMouseMoveGlobal);
      document.removeEventListener("mouseup", handleMouseUpGlobal);
    };
    document.addEventListener("mousemove", handleMouseMoveGlobal);
    document.addEventListener("mouseup", handleMouseUpGlobal);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches[0]) handleTrackClickOrDrag(e.touches[0].clientX);
    const handleTouchMoveGlobal = (moveEvent: TouchEvent) => {
      if (moveEvent.touches[0]) handleTrackClickOrDrag(moveEvent.touches[0].clientX);
    };
    const handleTouchEndGlobal = () => {
      document.removeEventListener("touchmove", handleTouchMoveGlobal);
      document.removeEventListener("touchend", handleTouchEndGlobal);
    };
    document.addEventListener("touchmove", handleTouchMoveGlobal, { passive: true });
    document.addEventListener("touchend", handleTouchEndGlobal);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, x / rect.width));
    setHoverPct(pct);
    setHoverTime(pct * project.duration);
    setHoverX(x);
  };

  const handleMouseLeave = () => {
    setHoverPct(null);
  };

  const cycleSpeed = () => {
    const speeds = [1.0, 1.5, 2.0, 0.5];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    setSpeed(speeds[nextIdx]);
  };

  return (
    <div
      className={`border-t border-border px-5 py-4 bg-surface/30 backdrop-blur-md flex flex-col gap-3.5 transition-all select-none ${isFullscreen ? "w-full max-w-4xl mx-auto mb-4 rounded-2xl border border-border/40 bg-zinc-900/80 shadow-2xl" : ""
        }`}
    >
      {/* Progress Bar Row */}
      <div className="relative w-full group/timeline pt-1.5 pb-1">
        {/* Hover Tooltip */}
        {hoverPct !== null && (
          <div
            className="absolute bottom-7 -translate-x-1/2 z-30 rounded-lg bg-zinc-950/95 border border-border px-2.5 py-1.5 shadow-2xl text-[11px] font-mono text-zinc-100 select-none pointer-events-none flex flex-col items-center min-w-[100px] backdrop-blur-sm"
            style={{ left: `${hoverX}px` }}
          >
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-primary/90 mb-0.5 whitespace-nowrap">
              {hoverChapter}
            </span>
            <span className="font-semibold">{hoverTime.toFixed(1)}s</span>
          </div>
        )}

        {/* Custom Track */}
        <div
          ref={trackRef}
          className="relative w-full h-1.5 cursor-pointer rounded-full bg-border/40 hover:h-2.5 transition-all duration-150 flex items-center group/bar"
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Played Fill Progress */}
          <div
            className="absolute top-0 left-0 h-full rounded-full bg-primary"
            style={{ width: `${(currentTime / project.duration) * 100}%` }}
          />

          {/* Chapter Tick Marks */}
          {chapters.map((ch, idx) => {
            const pct = (ch.time / project.duration) * 100;
            return (
              <div
                key={idx}
                className="absolute top-0 w-[3px] h-full bg-background/90 hover:w-[5px] hover:bg-white transition-all cursor-pointer z-10"
                style={{ left: `${pct}%` }}
                title={`${ch.name} (${ch.time.toFixed(1)}s)`}
                onClick={(e) => {
                  e.stopPropagation();
                  scrubTo(ch.time);
                }}
              />
            );
          })}
        </div>
      </div>

      {/* Control Buttons Row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          {/* Play/Pause Button */}
          <button
            type="button"
            className="p-1.5 rounded-lg hover:bg-foreground/5 text-foreground transition-all duration-150 active:scale-95"
            onClick={togglePlayback}
            title={isPlaying ? "Pause (Space)" : currentTime >= project.duration ? "Replay" : "Play (Space)"}
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 text-primary">
                <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clipRule="evenodd" />
              </svg>
            )}
          </button>

          {/* Time text */}
          <span className="text-xs font-mono text-muted-foreground select-none">
            {currentTime.toFixed(1)}s / {project.duration.toFixed(1)}s
          </span>

          {/* Chapter Status */}
          <div className="hidden xs:flex items-center gap-1.5 px-3 py-1 rounded-full bg-border/20 text-[11px] font-medium text-foreground/85">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <span className="tracking-wide">{currentChapter}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Speed cycle button */}
          <button
            type="button"
            className="px-2.5 py-1 text-xs font-bold rounded-lg border border-border hover:bg-foreground/5 hover:border-foreground/20 text-foreground transition-all duration-150 active:scale-95"
            onClick={cycleSpeed}
            title="Playback Speed"
          >
            {speed.toFixed(1)}x
          </button>

          {/* Export Button */}
          <div className="relative">
            <button
              type="button"
              disabled={isExporting}
              onClick={() => setShowExportMenu(!showExportMenu)}
              title={isExporting ? `Exporting… ${Math.round(exportProgress * 100)}%` : "Export options"}
              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg border transition-all duration-150 active:scale-95 cursor-pointer ${
                isExporting
                  ? "border-primary/40 bg-primary/10 text-primary cursor-wait"
                  : "border-border hover:bg-primary/10 hover:border-primary/40 hover:text-primary text-foreground"
              }`}
            >
              {isExporting ? (
                <>
                  {/* Spinner */}
                  <svg
                    className="w-3.5 h-3.5 animate-spin text-primary"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span>{Math.round(exportProgress * 100)}%</span>
                </>
              ) : (
                <>
                  {/* Download icon */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="w-3.5 h-3.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
                    />
                  </svg>
                  <span>Export</span>
                </>
              )}
            </button>

            {/* Dropdown Menu */}
            {showExportMenu && !isExporting && (
              <div
                ref={menuRef}
                className="absolute right-0 bottom-full mb-2 w-56 rounded-xl border border-border bg-zinc-950/95 backdrop-blur-md shadow-2xl p-1.5 z-50 flex flex-col gap-1 text-left animate-in fade-in slide-in-from-bottom-2 duration-150"
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    startExport("video");
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition-all flex flex-col gap-0.5 group/item cursor-pointer"
                >
                  <span className="text-xs font-semibold text-zinc-100 group-hover/item:text-primary transition-colors flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-zinc-400 group-hover/item:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Export Video
                  </span>
                  <span className="text-[10px] text-zinc-400">MP4 / WebM • 30 FPS • Full Res</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowExportMenu(false);
                    startExport("gif", { fps: 12, gifWidth: 480, gifColors: 256 });
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition-all flex flex-col gap-0.5 group/item cursor-pointer"
                >
                  <span className="text-xs font-semibold text-zinc-100 group-hover/item:text-primary transition-colors flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5 text-zinc-400 group-hover/item:text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Export GIF
                  </span>
                  <span className="text-[10px] text-zinc-400">Animated GIF • 12 FPS • 480px</span>
                </button>
              </div>
            )}
          </div>

          {/* Fullscreen Button */}
          <button
            type="button"
            className="p-1.5 rounded-lg hover:bg-foreground/5 text-foreground transition-all duration-150 active:scale-95"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (F)" : "Enter Fullscreen (F)"}
          >
            {isFullscreen ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9 3.75 3.75M15 9V4.5M15 9h4.5M15 9l5.25-5.25M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 15v4.5M15 15h4.5M15 15l5.25 5.25" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75h4.5m-4.5 0v4.5m0-4.5L9 9M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9M3.75 20.25h4.5m-4.5 0v-4.5m0 4.5L9 15M20.25 20.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
