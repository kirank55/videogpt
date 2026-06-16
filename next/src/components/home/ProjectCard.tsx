type ProjectCardProps = {
  id: string;
  name: string;
  updatedAt: string;
  onClick?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
};

export function ProjectCard({ name, updatedAt, onClick, onDelete }: ProjectCardProps) {
  return (
    <article className="card overflow-hidden cursor-pointer hover:border-primary transition-all duration-200" onClick={onClick}>
      <div className="aspect-16/10 border-b border-border bg-muted/70 px-5 py-4">
        <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-border bg-surface text-sm text-muted-foreground">
          Thumbnail preview
        </div>
      </div>
      <div className="flex items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-foreground">
            {name}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{updatedAt}</p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(e);
          }}
          className="rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-danger hover:text-danger"
        >
          Delete
        </button>
      </div>
    </article>
  );
}

