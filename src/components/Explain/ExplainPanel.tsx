import { PERSONALIZATION_LEVELS, type ExplainHistoryEntry } from "../../lib/types";

interface ExplainPanelProps {
  isOpen: boolean;
  history: ExplainHistoryEntry[];
  canExplainSimpler: boolean;
  canExplainDeeper: boolean;
  isBusy: boolean;
  onExplainSimpler: () => void;
  onExplainDeeper: () => void;
  onClose: () => void;
}

function levelLabel(level: string): string {
  return PERSONALIZATION_LEVELS.find((item) => item.value === level)?.label ?? level;
}

function formatTimestamp(createdAt: number): string {
  return new Date(createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ExplainPanel({
  isOpen,
  history,
  canExplainSimpler,
  canExplainDeeper,
  isBusy,
  onExplainSimpler,
  onExplainDeeper,
  onClose,
}: ExplainPanelProps) {
  return (
    <aside
      aria-hidden={!isOpen}
      className={`fixed right-0 top-10 z-[65] h-[calc(100vh-2.5rem)] w-[350px] border-l border-slate-700/80 bg-slate-900/95 shadow-2xl transition-transform duration-300 ${
        isOpen ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="flex h-full flex-col">
        <header className="border-b border-slate-700/80 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Explain This</h2>
              <p className="mt-1 text-xs text-slate-400">
                Contextual explanations for selected text
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-600 px-2 py-1 text-xs text-slate-300 transition-colors hover:border-slate-500 hover:text-slate-100"
            >
              Close
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={onExplainSimpler}
              disabled={!canExplainSimpler || isBusy}
              className="rounded-md bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-100 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Explain simpler
            </button>
            <button
              type="button"
              onClick={onExplainDeeper}
              disabled={!canExplainDeeper || isBusy}
              className="rounded-md bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-100 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Explain deeper
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {history.length === 0 ? (
            <p className="rounded-lg border border-slate-700/70 bg-slate-800/60 p-3 text-xs text-slate-400">
              Select text from Transcript or Notes and choose Explain.
            </p>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-xl border border-slate-700/80 bg-slate-800/55 p-3"
                >
                  <div className="mb-2 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                    <span>{levelLabel(entry.level)}</span>
                    <span>{formatTimestamp(entry.createdAt)}</span>
                  </div>
                  <blockquote className="rounded-md border-l-2 border-blue-500/70 bg-slate-900/70 px-3 py-2 text-xs italic text-slate-200">
                    "{entry.selectedText}"
                  </blockquote>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
                    {entry.explanation}
                    {entry.isStreaming && (
                      <span
                        aria-hidden
                        className="ml-1 inline-block h-4 w-1 animate-pulse rounded bg-blue-400 align-middle"
                      />
                    )}
                  </div>
                  {entry.error && (
                    <p className="mt-2 text-xs text-red-300">{entry.error}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
