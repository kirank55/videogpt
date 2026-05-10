"use client";

import { useEffect, useRef, useState } from "react";

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type UsePlayerArgs = {
  duration: number;
  autoPlay: boolean;
  initialTime: number;
};

export type PlayerState = {
  currentTime: number;
  isPlaying: boolean;
  scrubTo: (value: number) => void;
  togglePlayback: () => void;
};

export function usePlayer({
  duration,
  autoPlay,
  initialTime,
}: UsePlayerArgs): PlayerState {
  const frameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState(() =>
    clamp(initialTime, 0, duration),
  );
  const [isPlaying, setIsPlaying] = useState(autoPlay);

  useEffect(() => {
    setCurrentTime(clamp(initialTime, 0, duration));
  }, [duration, initialTime]);

  useEffect(() => {
    setIsPlaying(autoPlay);
  }, [autoPlay]);

  useEffect(() => {
    if (!isPlaying) {
      lastTimestampRef.current = null;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      return;
    }

    const tick = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }

      const deltaSeconds = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;
      let reachedEnd = false;

      setCurrentTime((current) => {
        const next = current + deltaSeconds;
        if (next >= duration) {
          reachedEnd = true;
          return duration;
        }

        return next;
      });

      if (reachedEnd) {
        setIsPlaying(false);
        return;
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
      }
      lastTimestampRef.current = null;
    };
  }, [duration, isPlaying]);

  const togglePlayback = () => {
    if (currentTime >= duration) {
      setCurrentTime(0);
    }

    setIsPlaying((current) => !current);
  };

  const scrubTo = (value: number) => {
    setIsPlaying(false);
    setCurrentTime(value);
  };

  return {
    currentTime,
    isPlaying,
    scrubTo,
    togglePlayback,
  };
}
