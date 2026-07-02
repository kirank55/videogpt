"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/ui/store";
import { useShallow } from "zustand/react/shallow";
import { ProjectCard } from "@/components/home/ProjectCard";
import { EmptyState } from "@/components/home/EmptyState";
import { TopBar } from "@/components/layout/TopBar";

const actionBtnClass =
  "rounded-full bg-primary font-semibold text-primary-foreground transition-all duration-150 hover:opacity-90 active:scale-95 cursor-pointer shadow-sm";


export default function Page() {
  const router = useRouter();
  const { sessions, setActiveSessionId, deleteSession } = useStore(
    useShallow((s) => ({
      sessions: s.sessions,
      setActiveSessionId: s.setActiveSessionId,
      deleteSession: s.deleteSession,
    })),
  );

  const goToGenerate = (id: string | null = null) => {
    setActiveSessionId(id);
    router.push("/generate");
  };

  return (
    <>
      <TopBar
        title="Projects"
        actions={
          <button type="button" onClick={() => goToGenerate()} className={`px-5 py-2 text-sm ${actionBtnClass}`}>
            New Project
          </button>
        }
      />
      <main className="mt-6 flex-1 overflow-y-auto pr-1">
        {sessions.length === 0 ? (
          <EmptyState onNewProject={() => goToGenerate()} />
        ) : (
          <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sessions.map((session) => (
              <ProjectCard
                key={session.id}
                name={session.name}
                updatedAt={session.updatedAt}
                project={session.project}
                onClick={() => goToGenerate(session.id)}
                onDelete={() => deleteSession(session.id)}
              />
            ))}
          </section>
        )}
      </main>
    </>
  );
}
