import { PlayerCard } from "@/components/player";
import { TopBar } from "@/components/layout/TopBar";
import { demoProject } from "@/app/demo/demoProject";
import { bigDemoProject } from "@/app/demo/bigDemoProject";

const frameTimes = [0, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.9];
const bigFrameTimes = [0, 1, 2, 3, 4.5, 6, 8, 10, 12, 14, 14.9];

export default function DemoPage() {
  return (
    <>
      <TopBar title="Demo" />
      <main className="mt-6 flex-1 space-y-16">
        {/* ── Big Demo: Client–Server Architecture ──────────────── */}
        <div>
          <h2 className="mb-1 text-xl font-semibold tracking-tight">
            {bigDemoProject.name}
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {bigDemoProject.events.length} events · {bigDemoProject.duration}s ·{" "}
            {bigDemoProject.width}×{bigDemoProject.height}
          </p>
          <section className="grid gap-6 xl:grid-cols-3">
            {bigFrameTimes.map((time) => (
              <div key={time} className="space-y-3">
                <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
                  Frame at {time.toFixed(1)}s
                </p>
                <PlayerCard
                  project={bigDemoProject}
                  autoPlay={false}
                  initialTime={time}
                />
              </div>
            ))}
          </section>
        </div>

        {/* ── Original Demo: Launch Loop ────────────────────────── */}
        <div>
          <h2 className="mb-1 text-xl font-semibold tracking-tight">
            {demoProject.name}
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            {demoProject.events.length} events · {demoProject.duration}s ·{" "}
            {demoProject.width}×{demoProject.height}
          </p>
          <section className="grid gap-6 xl:grid-cols-3">
            {frameTimes.map((time) => (
              <div key={time} className="space-y-3">
                <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
                  Frame at {time.toFixed(1)}s
                </p>
                <PlayerCard
                  project={demoProject}
                  autoPlay={false}
                  initialTime={time}
                />
              </div>
            ))}
          </section>
        </div>
      </main>
    </>
  );
}
