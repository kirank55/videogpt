"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import {
  renderProjectFrame,
  type VideoProject,
} from "@/lib/ui/renderer";
import {
  loadDevGeneratedProjects,
  type DevGeneratedProject,
} from "@/lib/ui/devGeneratedProjects";
import { directTimelineDiagnostics } from "@/lib/ui/devProjectDiagnostics";
import { useStore } from "@/lib/ui/store";

function FramePreview({ project, time }: { project: VideoProject; time: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    renderProjectFrame(context, project, time);
  }, [project, time]);

  return (
    <canvas
      ref={canvasRef}
      width={project.width}
      height={project.height}
      className="aspect-video w-full rounded-xl border border-border bg-black"
    />
  );
}

function DirectTimelineInspector() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessions = useStore((state) => state.sessions);
  const partId = searchParams.get("partId");
  const sessionId = searchParams.get("sessionId");
  const messageId = searchParams.get("messageId");
  const [partRecord] = useState<DevGeneratedProject | undefined>(() => (
    partId
      ? loadDevGeneratedProjects().find((item) => item.id === partId)
      : undefined
  ));
  const [time, setTime] = useState(0);

  const message = useMemo(() => {
    if (!sessionId || !messageId) return undefined;
    return sessions
      .find((session) => session.id === sessionId)
      ?.messages.find((item) => item.id === messageId);
  }, [messageId, sessionId, sessions]);

  const project = partRecord?.project ?? message?.project;
  const content = partRecord?.content;
  const diagnostics = directTimelineDiagnostics(content, project);

  if (!project) {
    return (
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 p-6">
        <TopBar title="Direct timeline inspector" />
        <section className="card p-8 text-center">
          <h1 className="text-xl font-semibold">Project not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            The saved project may have been removed from local storage.
          </p>
          <button className="button-primary mt-5" onClick={() => router.push("/dev")}>
            Back to developer projects
          </button>
        </section>
      </main>
    );
  }

  const eventTypeCounts = project.events.reduce<Record<string, number>>((counts, event) => {
    counts[event.type] = (counts[event.type] ?? 0) + 1;
    return counts;
  }, {});
  const layers = [...new Set(project.events.map((event) => event.layer))].sort((a, b) => a - b);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 p-6">
      <TopBar
        title={diagnostics?.name ?? project.name}
        actions={(
          <button className="button-secondary" onClick={() => router.push("/dev")}>
            Back
          </button>
        )}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,1fr)]">
        <section className="card p-4">
          <FramePreview project={project} time={time} />
          <div className="mt-4 flex items-center gap-4">
            <input
              aria-label="Preview time"
              className="w-full accent-cyan-400"
              type="range"
              min={0}
              max={project.duration}
              step={0.01}
              value={time}
              onChange={(event) => setTime(Number(event.target.value))}
            />
            <output className="w-20 text-right font-mono text-sm">{time.toFixed(2)}s</output>
          </div>
        </section>

        <aside className="card space-y-5 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Authorship
            </p>
            <p className="mt-2 text-lg font-semibold">
              {diagnostics?.mode ?? "composed direct timeline"}
            </p>
            {diagnostics?.visualIntent ? (
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {diagnostics.visualIntent}
              </p>
            ) : null}
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg border border-border p-3">
              <dt className="text-muted-foreground">Duration</dt>
              <dd className="mt-1 font-mono">{project.duration}s</dd>
            </div>
            <div className="rounded-lg border border-border p-3">
              <dt className="text-muted-foreground">Events</dt>
              <dd className="mt-1 font-mono">{project.events.length}</dd>
            </div>
            <div className="rounded-lg border border-border p-3">
              <dt className="text-muted-foreground">Canvas</dt>
              <dd className="mt-1 font-mono">{project.width}×{project.height}</dd>
            </div>
            <div className="rounded-lg border border-border p-3">
              <dt className="text-muted-foreground">Layers</dt>
              <dd className="mt-1 font-mono">{layers.join(", ") || "none"}</dd>
            </div>
          </dl>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Event vocabulary
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(eventTypeCounts).map(([type, count]) => (
                <span key={type} className="rounded-full border border-border px-3 py-1 text-sm">
                  {type} <span className="font-mono text-muted-foreground">{count}</span>
                </span>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold">Authored timeline events</h2>
        </div>
        <pre className="max-h-[520px] overflow-auto p-5 text-xs leading-5">
          {JSON.stringify(content ?? project.events, null, 2)}
        </pre>
      </section>
    </main>
  );
}

export default function AdvancePage() {
  return (
    <Suspense fallback={<main className="p-8">Loading direct timeline inspector…</main>}>
      <DirectTimelineInspector />
    </Suspense>
  );
}
