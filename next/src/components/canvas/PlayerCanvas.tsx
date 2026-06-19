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

    try {
      renderProjectFrame(context, project, currentTime);
    } catch (err) {
      console.error("[PlayerCanvas] Error rendering frame:", err);
      try {
        // Draw detailed visual fallback inside the canvas to report errors
        context.fillStyle = "#1e1b4b"; // Dark indigo background
        context.fillRect(0, 0, project.width, project.height);
        
        // Grid pattern
        context.strokeStyle = "rgba(244, 63, 94, 0.15)";
        context.lineWidth = 1;
        for (let i = 0; i < project.width; i += 40) {
          context.beginPath();
          context.moveTo(i, 0);
          context.lineTo(i, project.height);
          context.stroke();
        }
        for (let j = 0; j < project.height; j += 40) {
          context.beginPath();
          context.moveTo(0, j);
          context.lineTo(project.width, j);
          context.stroke();
        }

        context.fillStyle = "#f43f5e"; // Rose error text
        context.font = "bold 36px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText("Visual Render Error", project.width / 2, project.height / 2 - 40);
        
        context.fillStyle = "#a1a1aa";
        context.font = "24px monospace";
        const errMsg = err instanceof Error ? err.message : String(err);
        context.fillText(errMsg.slice(0, 75), project.width / 2, project.height / 2 + 30);
      } catch (nestedErr) {
        // Fallback for nested errors
      }
    }
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
