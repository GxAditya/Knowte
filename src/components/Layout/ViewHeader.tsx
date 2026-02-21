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
    <header className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      <div className="border-b border-slate-300/90 dark:border-slate-700/90" />
    </header>
  );
}
