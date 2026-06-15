"use client";

import { useEffect, useRef } from "react";
import { renderProjectFrame, type VideoProject } from "@/lib/renderer";

type PlayerCanvasProps = {
  project: VideoProject;
  currentTime: number;
  className?: string;
};

export function PlayerCanvas({
  project,
  currentTime,
  className = "w-full h-auto rounded-2xl border border-border bg-black/20",
}: PlayerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
