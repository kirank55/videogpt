"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/ui/store";
import { TopBar } from "@/components/layout/TopBar";
import { renderProjectFrame, type VideoProject } from "@/lib/ui/renderer";
import type { ChatMessage, Session } from "@/types/generate";

// ── Thumbnail Canvas ──────────────────────────────────────────────────────────
function ProjectThumbnail({ project }: { project?: VideoProject }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx || !project) return;
    renderProjectFrame(ctx, project, project.duration * 0.2);
  }, [project]);

  if (!project) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted/30 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 border border-dashed border-border/40">
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

// ── Action button ─────────────────────────────────────────────────────────────
function ActionButton({
  icon,
  label,
  onClick,
  variant = "default",
}: {
  icon: React.ReactNode;
  label: string;
  onClick: (e: React.MouseEvent) => void;
  variant?: "default" | "accent";
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95 cursor-pointer ${
        variant === "accent"
          ? "border-primary/40 bg-primary/8 text-primary hover:bg-primary/15"
          : "border-border text-muted-foreground hover:border-foreground/30 hover:bg-foreground/5 hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Dev Video Card ────────────────────────────────────────────────────────────
type DevCardItem = {
  id: string;
  name: string;
  updatedAt: string;
  project: VideoProject;
  sessionId?: string;
  messageId?: string;
  isTemp?: boolean;
};

function DevVideoCard({
  item,
  onPlay,
  onDiagnostics,
}: {
  item: DevCardItem;
  onPlay: () => void;
  onDiagnostics?: () => void;
}) {
  const layout = item.project.events.some((e) =>
    e.id.startsWith("block-heading-")
  )
    ? "Single Column"
    : "Two-Column Split";

  const textEventCount = item.project.events.filter(
    (e) =>
      e.type === "text" &&
      (e.id.startsWith("block-heading-") ||
        e.id.startsWith("left-label-") ||
        e.id.startsWith("right-label-"))
  ).length;

  return (
    <article
      onClick={onPlay}
      className="card group overflow-hidden cursor-pointer transition-all duration-200 hover:border-foreground/40 hover:-translate-y-0.5 hover:shadow-md flex flex-col"
    >
      {/* Thumbnail */}
      <div className="aspect-video border-b border-border bg-muted/30 overflow-hidden p-3 transition-colors duration-200 group-hover:bg-muted/50">
        <ProjectThumbnail project={item.project} />
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-3 px-5 py-4 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                {item.name}
              </h2>
              {item.isTemp && (
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary border border-primary/20">
                  CLI
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              <span>{layout}</span>
              <span>•</span>
              <span>{textEventCount} Layers</span>
              <span>•</span>
              <span>{item.project.duration}s</span>
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{item.updatedAt}</p>
          </div>
        </div>

        {/* Action buttons row */}
        <div className="flex items-center gap-2 flex-wrap border-t border-border/40 pt-3">
          {/* Play */}
          <ActionButton
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.841z" />
              </svg>
            }
            label="Play"
            variant="accent"
            onClick={(e) => {
              e.stopPropagation();
              onPlay();
            }}
          />

          {/* Diagnostics — only for sessions that have IDs */}
          {onDiagnostics && (
            <ActionButton
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h13A1.5 1.5 0 0118 3.5v13a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 012 16.5v-13zM6.5 6a.5.5 0 000 1h7a.5.5 0 000-1h-7zm0 3a.5.5 0 000 1h7a.5.5 0 000-1h-7zm0 3a.5.5 0 000 1h4a.5.5 0 000-1h-4z" clipRule="evenodd" />
                </svg>
              }
              label="Diagnostics"
              onClick={(e) => {
                e.stopPropagation();
                onDiagnostics();
              }}
            />
          )}

          {/* Events count badge */}
          <span className="ml-auto text-[10px] font-mono text-muted-foreground/60">
            {item.project.events.length} events
          </span>
        </div>
      </div>
    </article>
  );
}

// ── Inline Play Modal ─────────────────────────────────────────────────────────
function PlayModal({
  item,
  onClose,
  onDiagnostics,
}: {
  item: DevCardItem;
  onClose: () => void;
  onDiagnostics?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const duration = item.project.duration;

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;

    const tick = (now: number) => {
      if (!isPlaying) return;
      if (startRef.current === null) startRef.current = now;
      const elapsed = ((now - startRef.current) / 1000) % duration;
      setCurrentTime(elapsed);
      ctx.clearRect(0, 0, canvas!.width, canvas!.height);
      renderProjectFrame(ctx, item.project, elapsed);
      rafRef.current = requestAnimationFrame(tick);
    };

    if (isPlaying) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      const canvas2 = canvasRef.current;
      const ctx2 = canvas2?.getContext("2d");
      if (ctx2) {
        ctx2.clearRect(0, 0, canvas2!.width, canvas2!.height);
        renderProjectFrame(ctx2, item.project, currentTime);
      }
    }

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, item.project, duration]);

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      startRef.current = null;
      setIsPlaying(true);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4 md:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-white truncate max-w-lg">{item.name}</h2>
          <div className="flex items-center gap-2">
            {onDiagnostics && (
              <button
                type="button"
                onClick={onDiagnostics}
                className="rounded-full bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-300 hover:text-white px-4 py-1.5 text-sm font-semibold transition cursor-pointer"
              >
                Diagnostics
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white px-4 py-1.5 text-sm font-semibold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="aspect-video w-full rounded-2xl overflow-hidden border border-zinc-800 bg-black">
          <canvas
            ref={canvasRef}
            width={item.project.width}
            height={item.project.height}
            className="w-full h-full object-contain"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 px-1">
          <button
            type="button"
            onClick={togglePlay}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition cursor-pointer shrink-0"
          >
            {isPlaying ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.841z" />
              </svg>
            )}
          </button>

          {/* Scrub bar */}
          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-none"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          <span className="text-xs font-mono text-zinc-400 shrink-0">
            {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </h2>
      <span className="rounded-full bg-foreground/5 border border-border/60 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
        {count}
      </span>
      <div className="flex-1 h-px bg-border/40" />
    </div>
  );
}

// ── Main Dev Content ──────────────────────────────────────────────────────────
interface CustomWindow extends Window {
  tempProject?: VideoProject;
  tempProjects?: VideoProject[];
}

function DevDashboardContent() {
  const router = useRouter();
  const sessions = useStore((s) => s.sessions);

  const [tempProjects, setTempProjects] = useState<VideoProject[]>([]);
  const [activeItem, setActiveItem] = useState<DevCardItem | null>(null);

  // Load CLI / temp projects from window globals
  useEffect(() => {
    if (typeof window !== "undefined") {
      const win = window as unknown as CustomWindow;
      const projects: VideoProject[] = [];
      if (win.tempProject) projects.push(win.tempProject);
      if (Array.isArray(win.tempProjects)) projects.push(...win.tempProjects);

      const unique: VideoProject[] = [];
      const seen = new Set<string>();
      for (const p of projects) {
        if (p?.id && !seen.has(p.id)) {
          seen.add(p.id);
          unique.push(p);
        }
      }
      setTempProjects(unique);
    }
  }, []);

  // Build card items from store sessions
  const sessionItems: DevCardItem[] = sessions.flatMap((session: Session) => {
    const assistantMessages = session.messages.filter(
      (m: ChatMessage) => m.role === "assistant" && m.project
    );
    if (assistantMessages.length === 0) return [];
    // Use the latest assistant message with a project
    const latest = assistantMessages[assistantMessages.length - 1];
    if (!latest.project) return [];
    return [
      {
        id: `${session.id}-${latest.id}`,
        name: session.name,
        updatedAt: session.updatedAt,
        project: latest.project,
        sessionId: session.id,
        messageId: latest.id,
      },
    ];
  });

  // CLI items from tempProjects
  const tempItems: DevCardItem[] = tempProjects.map((proj) => ({
    id: proj.id,
    name: proj.name || "Untitled CLI Project",
    updatedAt: `${proj.duration}s · CLI generated`,
    project: proj,
    isTemp: true,
  }));

  const handleDiagnostics = (item: DevCardItem) => {
    if (item.sessionId && item.messageId) {
      router.push(
        `/dev/advance?sessionId=${item.sessionId}&messageId=${item.messageId}`
      );
    }
  };

  const totalCount = sessionItems.length + tempItems.length;

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Load CLI temp project data if present */}
      <Script src="/temp-project-data.js" strategy="beforeInteractive" />

      <div className="flex-1 p-6 md:p-10 flex flex-col">
        <TopBar
          title="Dev Dashboard"
          actions={
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-all duration-150 active:scale-95 cursor-pointer"
            >
              ← Back to Projects
            </button>
          }
        />

        <main className="mt-6 flex-1">
          {totalCount === 0 ? (
            <section className="card flex min-h-[400px] flex-col items-center justify-center p-8 text-center bg-surface-raised border border-border/80">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground/80 mb-5">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/60">
                No videos
              </p>
              <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground">
                Nothing to diagnose yet
              </h2>
              <p className="mt-2.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
                Generate some videos from the workspace and they'll appear here with diagnostic tools.
              </p>
              <button
                type="button"
                onClick={() => router.push("/generate")}
                className="mt-6 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-all duration-150 hover:opacity-90 active:scale-95 cursor-pointer shadow-sm"
              >
                Go to Workspace
              </button>
            </section>
          ) : (
            <div className="space-y-10">
              {/* Session Videos */}
              {sessionItems.length > 0 && (
                <div>
                  <SectionHeader title="Workspace Videos" count={sessionItems.length} />
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {sessionItems.map((item) => (
                      <DevVideoCard
                        key={item.id}
                        item={item}
                        onPlay={() => setActiveItem(item)}
                        onDiagnostics={() => handleDiagnostics(item)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* CLI / Temp Videos */}
              {tempItems.length > 0 && (
                <div>
                  <SectionHeader title="CLI Generated" count={tempItems.length} />
                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {tempItems.map((item) => (
                      <DevVideoCard
                        key={item.id}
                        item={item}
                        onPlay={() => setActiveItem(item)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Play modal */}
      {activeItem && (
        <PlayModal
          item={activeItem}
          onClose={() => setActiveItem(null)}
          onDiagnostics={
            activeItem.sessionId && activeItem.messageId
              ? () => handleDiagnostics(activeItem)
              : undefined
          }
        />
      )}
    </div>
  );
}

// ── Root Export ───────────────────────────────────────────────────────────────
export default function DevDashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-muted-foreground text-sm animate-pulse">
          Loading dev dashboard...
        </div>
      }
    >
      <DevDashboardContent />
    </Suspense>
  );
}
