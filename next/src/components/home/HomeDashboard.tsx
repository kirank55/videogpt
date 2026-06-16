"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
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
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            New Project
          </button>
        }
      />
      <main className="mt-6 flex-1">
        {sessions.length === 0 ? (
          <section className="card flex min-h-96 flex-col items-center justify-center px-6 text-center">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
              No projects yet
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              Start your first visual concept
            </h1>
            <p className="mt-3 max-w-xl text-base text-muted-foreground">
              Create a project to begin drafting prompts, timelines, and preview
              states for your next video.
            </p>
          </section>
        ) : (
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sessions.map((session) => (
              <ProjectCard
                key={session.id}
                id={session.id}
                name={session.name}
                updatedAt={session.updatedAt}
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

