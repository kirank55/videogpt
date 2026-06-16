"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { TopBar } from "@/components/layout/TopBar";
import { renderProjectFrame } from "@/lib/renderer";
import { visibleEvents } from "@/lib/renderer/visibleEvents";

// ── Frame Thumbnail Component ────────────────────────────────────────────────
function FrameThumbnail({
  project,
  time,
  onClick,
  active,
}: {
  project: any;
  time: number;
  onClick: () => void;
  active: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !project) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Clear and render static frame at specific timestamp
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderProjectFrame(ctx, project, time);
  }, [project, time]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex flex-col gap-1.5 p-2 rounded-xl border text-left transition-all cursor-pointer ${
        active
          ? "border-foreground bg-foreground/5 shadow-sm font-semibold"
          : "border-border hover:border-foreground/30 hover:bg-foreground/[0.01]"
      }`}
    >
      <span className="text-[10px] font-mono text-muted-foreground group-hover:text-foreground">
        {time.toFixed(1)}s
      </span>
      <div className="aspect-video w-full rounded-lg overflow-hidden border border-border/60 bg-black/10">
        <canvas
          ref={canvasRef}
          width={project.width || 800}
          height={project.height || 450}
          className="w-full h-full object-cover"
        />
      </div>
    </button>
  );
}

// ── Advanced Mode Diagnostics Workspace ───────────────────────────────────────
function AdvanceWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const messageId = searchParams.get("messageId");

  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);

  // Determine target session and message
  const targetSessionId = sessionId || activeSessionId;
  const session = sessions.find((s) => s.id === targetSessionId);
  const message = messageId
    ? session?.messages.find((m) => m.id === messageId)
    : session?.messages[session.messages.length - 1]; // fallback to latest assistant msg

  const project = message?.project;
  const brief = message?.brief;

  // State
  const [activeTab, setActiveTab] = useState<"metadata" | "brief" | "project">("metadata");
  const [selectedTime, setSelectedTime] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  const focusCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Redirect if missing critical details
  useEffect(() => {
    if (!targetSessionId || !messageId) {
      router.replace("/");
    }
  }, [targetSessionId, messageId, router]);

  // Sync rendering on main focus canvas
  useEffect(() => {
    const canvas = focusCanvasRef.current;
    if (!canvas || !project) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    renderProjectFrame(ctx, project, selectedTime);
  }, [project, selectedTime]);

  if (!session || !message || !project) {
    return (
      <div className="flex h-screen flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground animate-pulse">Loading diagnostics data...</p>
      </div>
    );
  }

  // Generate 12 frame timestamps spaced evenly
  const frameCount = 12;
  const duration = project.duration || 5;
  const frameTimes = Array.from({ length: frameCount }, (_, i) => (duration / (frameCount - 1)) * i);

  // Fetch active events at selected time
  const activeEvents = visibleEvents(project, selectedTime);

  // Copy code utility
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCodeContent = () => {
    if (activeTab === "brief") return JSON.stringify(brief || { error: "No Brief generated for this frame version" }, null, 2);
    if (activeTab === "project") return JSON.stringify(project, null, 2);
    return "";
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden h-full">
      <TopBar
        title="Diagnostics"
        actions={
          <button
            type="button"
            onClick={() => router.push("/generate")}
            className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition-all duration-150 hover:bg-foreground/3 hover:text-foreground active:scale-95 cursor-pointer"
          >
            Back to Workspace
          </button>
        }
      />

      <main className="mt-6 flex flex-1 overflow-hidden gap-6 h-[calc(100vh-140px)]">
        {/* ── Left Column: Data Inspector ─────────────────────────────── */}
        <section className="w-1/2 flex flex-col h-full border border-border bg-surface-raised rounded-xl p-5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
            <div className="flex gap-1.5 bg-background p-0.5 rounded-lg border border-border/80">
              {(["metadata", "brief", "project"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer ${
                    activeTab === tab
                      ? "bg-surface-raised text-foreground shadow-xs border border-border/10"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "metadata" ? "Metadata" : tab === "brief" ? "AI Brief JSON" : "Timeline JSON"}
                </button>
              ))}
            </div>

            {activeTab !== "metadata" && (
              <button
                type="button"
                onClick={() => handleCopy(getCodeContent())}
                className="rounded-lg border border-border px-2.5 py-1 text-xs font-bold text-muted-foreground hover:bg-foreground/5 hover:text-foreground transition-all duration-150 cursor-pointer"
              >
                {copied ? "Copied!" : "Copy JSON"}
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === "metadata" && (
              <div className="space-y-6 overflow-y-auto pr-1">
                <div>
                  <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">
                    Project Info
                  </h3>
                  <table className="w-full text-xs text-left text-muted-foreground">
                    <tbody>
                      <tr className="border-b border-border/40 py-2">
                        <td className="font-semibold text-foreground py-2.5 w-1/3">Project Name</td>
                        <td>{project.name}</td>
                      </tr>
                      <tr className="border-b border-border/40 py-2">
                        <td className="font-semibold text-foreground py-2.5">Duration</td>
                        <td>{duration.toFixed(1)}s</td>
                      </tr>
                      <tr className="border-b border-border/40 py-2">
                        <td className="font-semibold text-foreground py-2.5">Aspect Ratio</td>
                        <td>{project.width} × {project.height}</td>
                      </tr>
                      <tr className="border-b border-border/40 py-2">
                        <td className="font-semibold text-foreground py-2.5">Total Timeline Events</td>
                        <td>{project.events.length} layers</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div>
                  <h3 className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-3">
                    Style Catalog Specs
                  </h3>
                  <table className="w-full text-xs text-left text-muted-foreground">
                    <tbody>
                      <tr className="border-b border-border/40 py-2">
                        <td className="font-semibold text-foreground py-2.5 w-1/3">Color Palette</td>
                        <td className="font-mono text-[11px] bg-background px-2 py-0.5 rounded border border-border/40 inline-block">
                          {brief?.palette || "Default (midnight)"}
                        </td>
                      </tr>
                      <tr className="border-b border-border/40 py-2">
                        <td className="font-semibold text-foreground py-2.5">Style Presets</td>
                        <td className="font-mono text-[11px] bg-background px-2 py-0.5 rounded border border-border/40 inline-block">
                          {brief?.style || "Default (modern)"}
                        </td>
                      </tr>
                      <tr className="border-b border-border/40 py-2">
                        <td className="font-semibold text-foreground py-2.5">Layout Selector</td>
                        <td className="font-mono text-[11px] bg-background px-2 py-0.5 rounded border border-border/40 inline-block">
                          {brief?.leftRows || brief?.rightRows ? "Two-Column" : "Single-Column"}
                        </td>
                      </tr>
                      {brief?.flow !== undefined && (
                        <tr className="border-b border-border/40 py-2">
                          <td className="font-semibold text-foreground py-2.5">Data Flow Animations</td>
                          <td>{brief.flow ? "Enabled" : "Disabled"}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab !== "metadata" && (
              <pre className="flex-1 bg-background text-foreground p-4 rounded-xl text-xs font-mono overflow-auto whitespace-pre-wrap select-text border border-border/80">
                {getCodeContent()}
              </pre>
            )}
          </div>
        </section>

        {/* ── Right Column: Visual Timeline & Frame Inspector ─────────── */}
        <section className="w-1/2 flex flex-col h-full border border-border bg-surface-raised rounded-xl p-5 overflow-hidden">
          <div className="border-b border-border/60 pb-3 mb-4">
            <h3 className="text-sm font-bold text-foreground">Timeline Frame Steps</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Inspecting {duration.toFixed(1)}s timeline. Click any frame to focus details.
            </p>
          </div>

          {/* Thumbnails grid */}
          <div className="grid grid-cols-4 gap-2.5 overflow-y-auto pb-4 max-h-[200px] border-b border-border/40 pr-1 select-none">
            {frameTimes.map((time) => (
              <FrameThumbnail
                key={time}
                project={project}
                time={time}
                onClick={() => setSelectedTime(time)}
                active={Math.abs(selectedTime - time) < 0.01}
              />
            ))}
          </div>

          {/* Focused frame & event details */}
          <div className="flex-1 mt-4 flex gap-4 overflow-hidden">
            {/* Focus Canvas */}
            <div className="w-1/2 flex flex-col gap-2 overflow-hidden justify-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/85">
                Focus Frame at {selectedTime.toFixed(2)}s
              </span>
              <div className="aspect-video w-full rounded-xl overflow-hidden border border-border/80 bg-black/25 flex items-center justify-center p-1">
                <canvas
                  ref={focusCanvasRef}
                  width={project.width || 800}
                  height={project.height || 450}
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Event layer checklist */}
            <div className="w-1/2 flex flex-col overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/85 mb-2.5">
                Active Layers ({activeEvents.length})
              </span>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 select-text">
                {activeEvents.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground/60 italic">
                    No active drawing layers at this moment.
                  </div>
                ) : (
                  activeEvents.map((event, idx) => (
                    <div
                      key={`${event.id}-${idx}`}
                      className="p-3 bg-background border border-border/80 rounded-xl space-y-1.5 shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-widest bg-foreground/5 text-foreground px-1.5 py-0.5 rounded border border-border/40">
                          {event.type}
                        </span>
                        <span className="text-[9px] font-mono text-muted-foreground/85">
                          Layer {event.layer}
                        </span>
                      </div>
                      <div className="text-[11px]">
                        <span className="font-semibold text-foreground">ID:</span>{" "}
                        <span className="font-mono text-[10px] bg-foreground/5 px-1 py-0.5 rounded">
                          {event.id}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        <span className="font-semibold text-foreground">Timing:</span>{" "}
                        {event.start.toFixed(1)}s – {event.end.toFixed(1)}s
                      </div>
                      {/* Custom context summary based on properties */}
                      {event.type === "text" && (event as any).properties?.text && (
                        <div className="text-[11px] border-t border-border/40 pt-1.5 mt-1">
                          <span className="font-semibold text-foreground">Content:</span>{" "}
                          <span className="italic">"{(event as any).properties.text}"</span>
                        </div>
                      )}
                      {event.type === "shape" && (event as any).properties?.shapeType && (
                        <div className="text-[11px] border-t border-border/40 pt-1.5 mt-1">
                          <span className="font-semibold text-foreground">Shape:</span>{" "}
                          {(event as any).properties.shapeType}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

// ── Root Suspense Wrapper ───────────────────────────────────────────────────
export default function AdvanceDiagnosticsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center p-6">
          <p className="text-sm text-muted-foreground">Loading diagnostics view...</p>
        </div>
      }
    >
      <AdvanceWorkspace />
    </Suspense>
  );
}
