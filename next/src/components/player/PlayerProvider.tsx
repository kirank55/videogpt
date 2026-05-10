"use client";

import {
  createContext,
  type ReactNode,
  useContext,
} from "react";
import type { VideoProject } from "@/lib/renderer";
import { usePlayer } from "@/lib/player";

type PlayerContextValue = {
  project: VideoProject;
  currentTime: number;
  isPlaying: boolean;
  scrubTo: (value: number) => void;
  togglePlayback: () => void;
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

  return (
    <PlayerContext.Provider value={{ project, ...playback }}>
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
