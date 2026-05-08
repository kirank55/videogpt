import Link from "next/link";

const navItems = [
  { href: "/", label: "Projects" },
  { href: "/generate", label: "Generate" },
  { href: "/test-canvas", label: "Canvas Lab" },
];

export function Sidebar() {
  return (
    <aside className="hidden border-r border-border bg-surface text-foreground md:flex md:min-h-screen md:flex-col">
      <div className="flex flex-1 flex-col px-6 py-8">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-muted-foreground">
            Videographic
          </p>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Studio</h1>
            <p className="mt-2 max-w-48 text-sm text-muted-foreground">
              Shape short-form visuals, prompts, and previews in one workspace.
            </p>
          </div>
        </div>

        <nav className="mt-10 flex flex-col gap-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="card px-4 py-3 text-sm font-medium transition-colors hover:border-primary hover:text-primary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <footer className="mt-auto pt-8 text-sm text-muted-foreground">
          <p>Drafting the visual shell first.</p>
          <p className="mt-1">Backend and rendering come next.</p>
        </footer>
      </div>
    </aside>
  );
}
