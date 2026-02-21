import type { ReactNode } from "react";

interface ViewHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export default function ViewHeader({
  title,
  description,
  actions,
}: ViewHeaderProps) {
  return (
    <header className="animate-slide-down space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1
            className="text-2xl font-semibold"
            style={{ color: "var(--text-primary)", fontFamily: "var(--font-heading)" }}
          >
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm" style={{ color: "var(--text-tertiary)" }}>
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div
        className="h-px"
        style={{ background: "var(--border-default)" }}
      />
    </header>
  );
}
