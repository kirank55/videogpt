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
      <div className="flex h-full flex-col items-center justify-center rounded-xl bg-linear-to-tr from-muted/50 via-surface/40 to-muted/50 border border-dashed border-border/70 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5 mb-2 opacity-50">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
        </svg>
        No preview
      </div>
    );
  }

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

export function ProjectCard({
  name,
  updatedAt,
  project,
  onClick,
  onDelete,
}: ProjectCardProps) {
  return (
    <article
      className="card group overflow-hidden cursor-pointer transition-all duration-200 hover:border-foreground/40 hover:-translate-y-0.5 hover:shadow-md"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="aspect-video border-b border-border bg-muted/30 overflow-hidden p-3 transition-colors duration-200 group-hover:bg-muted/50">
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
          className="shrink-0 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:border-danger/60 hover:bg-danger/5 hover:text-danger active:scale-95 cursor-pointer"
        >
          Delete
        </button>
      </div>
    </article>
  );
}
