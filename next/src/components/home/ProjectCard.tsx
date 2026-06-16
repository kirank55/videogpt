"use client";

import { useEffect, useRef } from "react";
import type { VideoProject } from "@/lib/renderer";
import { renderProjectFrame } from "@/lib/renderer";

type ProjectCardProps = {
  id: string;
  name: string;
  updatedAt: string;
  project?: VideoProject;
  onClick?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
};

/** Renders a single static frame of the project as a thumbnail. */
function ProjectThumbnail({ project }: { project?: VideoProject }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !project) return;
    // Render at the 20% mark — usually past title-card animation start
    renderProjectFrame(ctx, project, project.duration * 0.2);
  }, [project]);

  if (!project) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border bg-surface text-xs text-muted-foreground">
        No preview
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      width={project.width}
      height={project.height}
      className="h-full w-full rounded-xl object-cover"
      style={{ aspectRatio: `${project.width}/${project.height}` }}
    />
  );
}

export function ProjectCard({
  name,
  updatedAt,
  project,
  onClick,
  onDelete,
}: ProjectCardProps) {
  return (
    <article
      className="card group overflow-hidden cursor-pointer transition-all duration-200 hover:border-primary hover:shadow-[0_0_0_1px_var(--color-primary)/20] hover:-translate-y-0.5"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="aspect-video border-b border-border bg-muted/70 overflow-hidden p-3">
        <ProjectThumbnail project={project} />
      </div>

      {/* Meta */}
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
            e.stopPropagation();
            onDelete?.(e);
          }}
          className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition-all hover:border-danger/60 hover:bg-danger/5 hover:text-danger active:scale-95"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
