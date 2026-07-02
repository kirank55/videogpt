"use client";

import { useEffect, useRef } from "react";
import type { VideoProject } from "@/lib/ui/renderer";
import { renderProjectFrame } from "@/lib/ui/renderer";
import { NoPreview } from "@/components/home/NoPreview";

type ProjectCardProps = {
  name: string;
  updatedAt: string;
  project?: VideoProject;
  onClick?: () => void;
  onDelete: () => void;
};


/** Renders a single static frame of the project as a thumbnail. */
function ProjectThumbnailPreview({ project }: { project: VideoProject }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Render at the 20% mark — usually past title-card animation start
    renderProjectFrame(ctx, project, project.duration * 0.2);
  }, [project]);


  return (
    <canvas
      ref={canvasRef}
      width={project.width}
      height={project.height}
      className="h-full w-full rounded-lg object-cover"
      style={{ aspectRatio: `${project.width}/${project.height}` }}
    />
  );
}

export function ProjectCard({ name, updatedAt, project, onClick, onDelete }: ProjectCardProps) {
  return (
    <article
      className="card group overflow-hidden cursor-pointer transition-all duration-200 hover:border-foreground/40 hover:-translate-y-0.5 hover:shadow-md"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="aspect-video border-b border-border bg-muted/30 overflow-hidden p-3 transition-colors duration-200 group-hover:bg-muted/50">
        {project ?
          <ProjectThumbnailPreview project={project} />
          : <NoPreview />
        }
      </div>

      {/* Project details */}
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-foreground group-hover:text-primary transition-colors">
            {name}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{updatedAt}</p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            // stop onClick above
            e.stopPropagation();
            onDelete();
          }}
          className="shrink-0 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-danger/60 hover:bg-danger/5 hover:text-danger active:scale-95 cursor-pointer"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
