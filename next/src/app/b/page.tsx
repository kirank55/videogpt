"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import Script from "next/script";
import { useStore } from "@/lib/store";
import { renderProjectFrame, type VideoProject } from "@/lib/renderer";
import { TopBar } from "@/components/layout/TopBar";

import { PlayerCard } from "@/components/player/PlayerCard";

// Small thumbnail component that displays a static frame of a project
function ProjectThumbnail({ project }: { project: VideoProject }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !project) return;
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

// Modal video player component using the same PlayerCard as the generate page
function VideoPlayerModal({ project, onClose }: { project: VideoProject; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-99999 flex flex-col items-center justify-center bg-black/95 p-4 md:p-8">
      {/* Top Close Control */}
      <div className="absolute top-4 right-4 z-50">
        <button
          onClick={onClose}
          className="rounded-full bg-surface-raised border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-muted transition cursor-pointer shadow-md"
        >
          Close Player
        </button>
      </div>

      {/* Real Player Card Container from the generate page */}
      <div className="w-full max-w-5xl relative">
        <PlayerCard
          project={project}
          autoPlay={true}
          showControls={true}
        />
      </div>
    </div>
  );
}

function BriefOnlyContent() {
  const sessions = useStore((s) => s.sessions);
  const [tempProject, setTempProject] = useState<VideoProject | null>(null);
  const [activeProject, setActiveProject] = useState<VideoProject | null>(null);

  useEffect(() => {
    // Check if the script tempProject is loaded on window
    if (typeof window !== "undefined" && (window as any).tempProject) {
      setTempProject((window as any).tempProject);
    }
  }, []);

  // Construct final display list
  const displayProjects: Array<{
    id: string;
    name: string;
    updatedAt: string;
    project: VideoProject;
    isTemp?: boolean;
  }> = [];

  if (tempProject) {
    displayProjects.push({
      id: "temp-capture",
      name: tempProject.name || "Latest Capture (CLI)",
      updatedAt: "Just now",
      project: tempProject,
      isTemp: true
    });
  }

  sessions.forEach((s) => {
    if (s.project) {
      // Avoid duplicating the project if it has the same ID
      if (tempProject && s.project.id === tempProject.id) return;
      displayProjects.push({
        id: s.id,
        name: s.name,
        updatedAt: s.updatedAt,
        project: s.project
      });
    }
  });

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col p-6 md:p-10">
      {/* Script to load temp project data if present */}
      <Script src="/temp-project-data.js" strategy="beforeInteractive" />

      <TopBar title="Video Brief Viewer" />

      <header className="mb-8 mt-4">
        <p className="text-sm text-muted-foreground">
          Presentation dashboard showing generated animation briefs in looping grid cards. Click any card to preview the full animated brief.
        </p>
      </header>

      {displayProjects.length === 0 ? (
        <section className="card flex min-h-[400px] flex-col items-center justify-center p-8 text-center bg-surface-raised border border-border/80">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground/80 mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground">No briefs generated yet</h2>
          <p className="mt-2.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
            Run the captureFrames script or create projects on the homepage to generate video briefs.
          </p>
        </section>
      ) : (
        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {displayProjects.map((item) => (
            <article
              key={item.id}
              onClick={() => setActiveProject(item.project)}
              className="card group overflow-hidden cursor-pointer transition-all duration-200 hover:border-foreground/40 hover:-translate-y-0.5 hover:shadow-md"
            >
              {/* Thumbnail preview */}
              <div className="aspect-video border-b border-border bg-muted/30 overflow-hidden p-3 transition-colors duration-200 group-hover:bg-muted/50">
                <ProjectThumbnail project={item.project} />
              </div>

              {/* Card Meta */}
              <div className="flex items-start justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                      {item.name}
                    </h2>
                    {item.isTemp && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/20">
                        Latest CLI
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{item.updatedAt}</p>
                </div>
                <div className="shrink-0 rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-all group-hover:border-foreground/60 group-hover:bg-foreground/5 group-hover:text-foreground active:scale-95">
                  Play Brief
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Modal video player */}
      {activeProject && (
        <VideoPlayerModal
          project={activeProject}
          onClose={() => setActiveProject(null)}
        />
      )}
    </div>
  );
}

export default function BriefOnlyPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-black flex items-center justify-center text-muted-foreground font-sans text-2xl">
        Loading video brief player...
      </div>
    }>
      <BriefOnlyContent />
    </Suspense>
  );
}
