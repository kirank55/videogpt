"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/ui/store";
import { ProjectCard } from "@/components/home/ProjectCard";
import { TopBar } from "@/components/layout/TopBar";

export function HomeDashboard() {
  const router = useRouter();
  const sessions = useStore((s) => s.sessions);
  const setActiveSessionId = useStore((s) => s.setActiveSessionId);
  const deleteSession = useStore((s) => s.deleteSession);

  const handleNewProject = () => {
    setActiveSessionId(null);
    router.push("/generate");
  };

  const handleProjectClick = (id: string) => {
    setActiveSessionId(id);
    router.push("/generate");
  };

  return (
    <>
      <TopBar
        title="Projects"
        actions={
          <button
            type="button"
            onClick={handleNewProject}
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-all duration-150 hover:bg-primary/95 hover:opacity-90 active:scale-95 cursor-pointer shadow-sm"
          >
            New Project
          </button>
        }
      />
      <main className="mt-6 flex-1 overflow-y-auto pr-1">
        {sessions.length === 0 ? (
          <section className="card flex min-h-[400px] flex-col items-center justify-center p-8 text-center bg-surface-raised border border-border/80">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5 text-muted-foreground/80 mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/60">
              No projects yet
            </p>
            <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground">
              Start your first visual concept
            </h2>
            <p className="mt-2.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
              Create a project to begin drafting prompts, timelines, and preview
              states for your next video.
            </p>
            <button
              type="button"
              onClick={handleNewProject}
              className="mt-6 rounded-full bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground transition-all duration-150 hover:opacity-90 active:scale-95 cursor-pointer shadow-sm"
            >
              Create Project
            </button>
          </section>
        ) : (
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sessions.map((session) => (
              <ProjectCard
                key={session.id}
                id={session.id}
                name={session.name}
                updatedAt={session.updatedAt}
                project={session.project}
                onClick={() => handleProjectClick(session.id)}
                onDelete={() => deleteSession(session.id)}
              />
            ))}
          </section>
        )}
      </main>
    </>
  );
}

