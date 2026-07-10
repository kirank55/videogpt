"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Script from "next/script";
import { renderProjectFrame, type TextEvent, type VideoProject } from "@/lib/ui/renderer";
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

function parseProjectBrief(project: VideoProject) {
  const isTextEvent = (event: VideoProject["events"][number]): event is TextEvent =>
    event.type === "text";
  const titleEvent = project.events.find((e): e is TextEvent => e.id === "title" && isTextEvent(e));
  const subtitleEvent = project.events.find((e): e is TextEvent => e.id === "subtitle" && isTextEvent(e));
  const closingLineEvent = project.events.find((e): e is TextEvent => e.id === "closing-line" && isTextEvent(e));

  const title = titleEvent?.text || project.name;
  const subtitle = subtitleEvent?.text || "";
  const closingLine = closingLineEvent?.text || "";

  const sceneHeadings: string[] = [];
  const blocks: Array<{ sceneIndex: number; heading: string; description: string }> = [];
  const nodes: Array<{ sceneIndex: number; label: string }> = [];

  project.events.forEach((e) => {
    if (!isTextEvent(e)) return;

    const sceneMatch = e.id.match(/^scene-(\d+)-heading$/);
    if (sceneMatch) {
      sceneHeadings[Number(sceneMatch[1])] = e.text;
      return;
    }

    const blockMatch = e.id.match(/^scene-(\d+)-block-heading-(\d+)$/);
    if (blockMatch) {
      const sceneIndex = Number(blockMatch[1]);
      const blockIndex = Number(blockMatch[2]);
      const descEvent = project.events.find(
        (d): d is TextEvent => d.id === `scene-${sceneIndex}-block-desc-${blockIndex}` && isTextEvent(d),
      );
      blocks.push({
        sceneIndex,
        heading: e.text,
        description: descEvent?.text || "",
      });
      return;
    }

    const nodeMatch = e.id.match(/^scene-(\d+)-node-label-/);
    if (nodeMatch) {
      nodes.push({
        sceneIndex: Number(nodeMatch[1]),
        label: e.text,
      });
    }
  });

  const edgeCount = project.events.filter(e => e.id.includes("-edge-")).length;
  const packetCount = project.events.filter(e => e.id.includes("-packet-")).length;

  return {
    title,
    subtitle,
    closingLine,
    sceneHeadings: sceneHeadings.filter(Boolean),
    blocks,
    nodes,
    edgeCount,
    packetCount,
  };
}

// Modal video player component with split details view
function VideoPlayerModal({ project, onClose }: { project: VideoProject; onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<"brief" | "events" | "json">("brief");
  const briefInfo = parseProjectBrief(project);

  return (
    <div className="fixed inset-0 z-99999 flex flex-col items-center justify-center bg-black/95 p-4 md:p-6">
      {/* Header Bar */}
      <div className="w-full max-w-7xl flex items-center justify-between mb-4 z-50">
        <h2 className="text-xl font-bold text-white truncate max-w-2xl">{project.name}</h2>
        <button
          onClick={onClose}
          className="rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white px-5 py-2 text-sm font-semibold transition cursor-pointer shadow-md"
        >
          Close Player
        </button>
      </div>

      {/* Split Layout Container */}
      <div className="w-full max-w-7xl flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-0">
        {/* Left Side: Video Player */}
        <div className="lg:col-span-3 flex flex-col justify-center min-h-0">
          <PlayerCard
            project={project}
            autoPlay={true}
            showControls={true}
          />
        </div>

        {/* Right Side: Details Inspector Sidebar */}
        <div className="lg:col-span-2 flex flex-col bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden min-h-0 text-white shadow-xl">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800 text-sm font-medium">
            <button
              onClick={() => setActiveTab("brief")}
              className={`flex-1 py-3 text-center transition-colors cursor-pointer border-b border-b-2 ${
                activeTab === "brief"
                  ? "border-primary text-primary"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Brief Info
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`flex-1 py-3 text-center transition-colors cursor-pointer border-b border-b-2 ${
                activeTab === "events"
                  ? "border-primary text-primary"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Timeline ({project.events.length})
            </button>
            <button
              onClick={() => setActiveTab("json")}
              className={`flex-1 py-3 text-center transition-colors cursor-pointer border-b border-b-2 ${
                activeTab === "json"
                  ? "border-primary text-primary"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Raw JSON
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 text-zinc-300">
            {activeTab === "brief" && (
              <div className="space-y-4 text-left">
                {/* Meta */}
                <div>
                  <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Title & Subtitle</h3>
                  <h4 className="text-lg font-bold text-white">{briefInfo.title}</h4>
                  {briefInfo.subtitle && <p className="text-sm text-zinc-400 mt-1">{briefInfo.subtitle}</p>}
                </div>

                {/* Graph Summary */}
                <div className="grid grid-cols-2 gap-4 border-t border-zinc-800/80 pt-4">
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Diagram Model</h3>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 uppercase">
                      Graph
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Duration</h3>
                    <span className="text-sm font-mono text-zinc-300">{project.duration} seconds</span>
                  </div>
                </div>

                {/* Content Details */}
                <div className="border-t border-zinc-800/80 pt-4">
                  <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3">Scenes</h3>
                  <div className="flex flex-wrap gap-2">
                    {(briefInfo.sceneHeadings.length > 0 ? briefInfo.sceneHeadings : ["Scene 1"]).map((heading, idx) => (
                      <span key={`${heading}-${idx}`} className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs font-medium">
                        {heading}
                      </span>
                    ))}
                  </div>
                </div>

                {briefInfo.blocks.length > 0 && (
                  <div className="border-t border-zinc-800/80 pt-4">
                    <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-3">Blocks</h3>
                    <div className="space-y-3">
                      {briefInfo.blocks.map((block, idx) => (
                        <div key={idx} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/50">
                          <h5 className="text-sm font-bold text-white flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                              {idx + 1}
                            </span>
                            {block.heading}
                          </h5>
                          {block.description && (
                            <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{block.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="border-t border-zinc-800/80 pt-4 space-y-4">
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-2">Graph Nodes</h3>
                    <div className="flex flex-wrap gap-2">
                      {briefInfo.nodes.map((node, idx) => (
                        <span key={`${node.sceneIndex}-${node.label}-${idx}`} className="px-2.5 py-1 rounded bg-zinc-950 border border-zinc-800 text-xs font-medium">
                          {node.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Animated Packets</h3>
                    <span className="text-sm">{briefInfo.packetCount} packet event{briefInfo.packetCount === 1 ? "" : "s"} across {briefInfo.edgeCount} edge layer{briefInfo.edgeCount === 1 ? "" : "s"}</span>
                  </div>
                </div>

                {/* Closing Line */}
                {briefInfo.closingLine && (
                  <div className="border-t border-zinc-800/80 pt-4">
                    <h3 className="text-xs uppercase tracking-wider text-zinc-500 font-bold mb-1">Closing Outro</h3>
                    <p className="text-sm italic text-zinc-300">&ldquo;{briefInfo.closingLine}&rdquo;</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "events" && (
              <div className="space-y-3 font-mono text-xs text-left">
                {project.events.map((e) => (
                  <div key={e.id} className="bg-zinc-950 p-3 rounded-lg border border-zinc-800/50 flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white">{e.id}</span>
                      <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 uppercase font-semibold">
                        {e.type}
                      </span>
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1">
                      Time: {e.start}s - {e.end}s (Duration: {(e.end - e.start).toFixed(2)}s)
                    </div>
                    {e.type === "text" && (
                      <div className="text-[11px] text-primary/80 mt-1 bg-primary/5 p-1.5 rounded border border-primary/10 truncate">
                        &ldquo;{e.text}&rdquo;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {activeTab === "json" && (
              <div className="h-full flex flex-col text-left">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs text-zinc-500">Copy project config JSON</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(project, null, 2));
                    }}
                    className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-[11px] font-semibold active:scale-95 transition-all cursor-pointer"
                  >
                    Copy JSON
                  </button>
                </div>
                <pre className="flex-1 bg-zinc-950 p-4 rounded-lg border border-zinc-800 overflow-auto font-mono text-[11px] text-emerald-400 select-all max-h-[50vh]">
                  {JSON.stringify(project, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface CustomWindow extends Window {
  tempProject?: VideoProject;
  tempProjects?: VideoProject[];
}

function BriefOnlyContent() {
  const [tempProjects, setTempProjects] = useState<VideoProject[]>([]);
  const [activeProject, setActiveProject] = useState<VideoProject | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const win = window as unknown as CustomWindow;
      const projects: VideoProject[] = [];
      if (win.tempProject) {
        projects.push(win.tempProject);
      }
      if (Array.isArray(win.tempProjects)) {
        projects.push(...win.tempProjects);
      }
      // Deduplicate by ID
      const uniqueProjects: VideoProject[] = [];
      const seenIds = new Set<string>();
      for (const p of projects) {
        if (p && p.id && !seenIds.has(p.id)) {
          seenIds.add(p.id);
          uniqueProjects.push(p);
        }
      }
      setTimeout(() => {
        setTempProjects(uniqueProjects);
      }, 0);
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

  tempProjects.forEach((proj) => {
    if (proj && proj.id) {
      displayProjects.push({
        id: proj.id,
        name: proj.name || "Untitled Showcase",
        updatedAt: `${proj.duration}s Video Brief`,
        project: proj,
        isTemp: false
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
                <div className="min-w-0 flex-1 text-left">
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
                  {/* Summary of layout details */}
                  <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    <span>
                      Graph
                    </span>
                    <span>•</span>
                    <span>
                      {new Set(item.project.events.map(e => e.id.match(/^scene-(\d+)-heading$/)?.[1]).filter(Boolean)).size || 1} Scenes
                    </span>
                    <span>•</span>
                    <span>{item.project.duration}s</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{item.updatedAt}</p>
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
      <div className="fixed inset-0 bg-black flex items-center justify-center text-muted-foreground text-2xl">
        Loading video brief player...
      </div>
    }>
      <BriefOnlyContent />
    </Suspense>
  );
}
