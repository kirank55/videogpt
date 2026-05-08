import { Sidebar } from "@/components/layout/Sidebar";

export default function Page() {
  return (
    <main className="shell">
      <Sidebar />
      <section className="flex min-h-screen flex-col p-6 md:p-10">
        <div className="card flex-1 p-8">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Homepage Preview
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight">
            Sidebar verification page
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            This placeholder content lets you confirm the sidebar layout, colors,
            spacing, and responsive collapse behavior before we wire in the full
            dashboard.
          </p>
        </div>
      </section>
    </main>
  );
}
