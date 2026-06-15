"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { VideoProject } from "@/lib/renderer";
import { usePlayer } from "@/lib/player";

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

  return (
    <PlayerContext.Provider
      value={{
        project,
        ...playback,
        isFullscreen,
        toggleFullscreen,
        playerRef,
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
