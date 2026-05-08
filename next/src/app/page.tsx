import { TopBar } from "@/components/layout/TopBar";

export default function Page() {
  return (
    <>
      <TopBar
        title="Sidebar and top bar preview"
        actions={
          <button className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
            New Project
          </button>
        }
      />
      <main className="card mt-6 flex-1 p-8">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
          Homepage Preview
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Placeholder heading
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          This content area is ready for the upcoming dashboard and generation
          flows.
        </p>
      </main>
    </>
  );
}
