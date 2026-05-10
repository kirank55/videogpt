"use client";

import { useEffect, useRef } from "react";
import { usePlayerContext } from "@/components/player/PlayerProvider";
import { renderProjectFrame } from "@/lib/renderer";

type PlayerCanvasProps = {
  className?: string;
};

export function PlayerCanvas({
  className = "w-full rounded-2xl border border-border bg-black/20",
}: PlayerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { project, currentTime } = usePlayerContext();

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context) {
      return;
    }

    renderProjectFrame(context, project, currentTime);
  }, [currentTime, project]);

  return (
    <div className="bg-background/40 p-4">
      <canvas
        ref={canvasRef}
        width={project.width}
        height={project.height}
        className={className}
      />
    </div>
  );
}
