import type { ReactNode } from "react";

type TopBarProps = {
  title: string;
  actions?: ReactNode;
};

export function TopBar({ title, actions }: TopBarProps) {
  return (
    <header className="card flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="truncate text-lg font-semibold tracking-tight">
          {title}
        </div>
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-3">{actions}</div>
      ) : null}
    </header>
  );
}
