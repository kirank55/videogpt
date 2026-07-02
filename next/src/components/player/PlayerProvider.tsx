"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { VideoProject, TimelineEvent } from "@/lib/ui/renderer";
import { usePlayer } from "@/lib/ui/player";
import { exportVideo, type ExportFormat } from "@/lib/ui/core/VideoExporter";

type PlayerContextValue = {
  project: VideoProject;
  currentTime: number;
  isPlaying: boolean;
  speed: number;
  setSpeed: (value: number) => void;
  scrubTo: (value: number) => void;
  togglePlayback: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  playerRef: React.RefObject<HTMLDivElement | null>;
  isExporting: boolean;
  exportProgress: number;
  startExport: (
    format?: ExportFormat,
    options?: { fps?: number; gifWidth?: number; gifColors?: number }
  ) => Promise<void>;
  // Edit mode
  isEditMode: boolean;
  toggleEditMode: () => void;
  applyEdits: (updatedEvents: TimelineEvent[]) => void;
};

const PlayerContext = createContext<PlayerContextValue | null>(null);

type PlayerProviderProps = {
  project: VideoProject;
  autoPlay?: boolean;
  initialTime?: number;
  children: ReactNode;
};

export function PlayerProvider({
  project,
  autoPlay = true,
  initialTime = 0,
  children,
}: PlayerProviderProps) {
  const playback = usePlayer({
    duration: project.duration,
    autoPlay,
    initialTime,
  });

  const playerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  // Local copy of the project with in-memory edits applied
  const [editedProject, setEditedProject] = useState<VideoProject>(project);

  // Keep editedProject in sync when the source project changes (e.g. after regeneration)
  useEffect(() => {
    setEditedProject(project);
    if (isEditMode) setIsEditMode(false); // Exit edit mode on new project
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === playerRef.current);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!playerRef.current) return;
    if (!document.fullscreenElement) {
      playerRef.current.requestFullscreen().catch((err) => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error("Error attempting to exit fullscreen:", err);
      });
    }
  };

  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => {
      const entering = !prev;
      if (entering && playback.isPlaying) {
        playback.togglePlayback(); // pause when entering edit mode
      }
      return entering;
    });
  }, [playback]);

  const applyEdits = useCallback((updatedEvents: TimelineEvent[]) => {
    setEditedProject((prev) => ({ ...prev, events: updatedEvents }));
  }, []);

  const startExport = useCallback(async (
    format: ExportFormat = "video",
    options?: { fps?: number; gifWidth?: number; gifColors?: number }
  ) => {
    if (isExporting) return;
    setIsExporting(true);
    setExportProgress(0);
    try {
      await exportVideo(editedProject, {
        format,
        fps: options?.fps,
        gifWidth: options?.gifWidth,
        gifColors: options?.gifColors,
        onProgress: setExportProgress,
      });
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [isExporting, editedProject]);

  return (
    <PlayerContext.Provider
      value={{
        project: editedProject,
        ...playback,
        isFullscreen,
        toggleFullscreen,
        playerRef,
        isExporting,
        exportProgress,
        startExport,
        isEditMode,
        toggleEditMode,
        applyEdits,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayerContext() {
  const context = useContext(PlayerContext);

  if (!context) {
    throw new Error("Player components must be used within PlayerProvider.");
  }

  return context;
}
