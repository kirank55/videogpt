import { PlayerCard } from "@/components/player";
import { TopBar } from "@/components/layout/TopBar";
import { demoProject } from "@/app/demo/demoProject";

const frameTimes = [0, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.9];

export default function DemoPage() {
  return (
    <>
      <TopBar title="Demo" />
      <main className="mt-6 flex-1">
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
      </main>
    </>
  );
}
