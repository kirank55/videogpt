import { ProjectCard } from "@/components/home/ProjectCard";
import { TopBar } from "@/components/layout/TopBar";

type Project = {
  id: string;
  name: string;
  updatedAt: string;
};

const demoProjects: Project[] = [
  {
    id: "launch-loop",
    name: "Launch Loop Teaser",
    updatedAt: "Edited May 8, 2026",
  },
  {
    id: "founder-cut",
    name: "Founder Story Cutdown",
    updatedAt: "Edited May 6, 2026",
  },
  {
    id: "product-reel",
    name: "Product Reel V2",
    updatedAt: "Edited May 4, 2026",
  },
];

type HomeDashboardProps = {
  projects?: Project[];
};

export function HomeDashboard({
  projects = demoProjects,
}: HomeDashboardProps) {
  return (
    <>
      <TopBar
        title="Projects"
        actions={
          <button
            type="button"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            New Project
          </button>
        }
      />
      <main className="mt-6 flex-1">
        {projects.length === 0 ? (
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
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                name={project.name}
                updatedAt={project.updatedAt}
              />
            ))}
          </section>
        )}
      </main>
    </>
  );
}
