interface ToolbarPosition {
  left: number;
  top: number;
}

interface TextSelectionToolbarProps {
  isVisible: boolean;
  position: ToolbarPosition | null;
  onExplain: () => void;
  onAddToFlashcards: () => void;
  onCopy: () => void;
  disableActions?: boolean;
}

export default function TextSelectionToolbar({
  isVisible,
  position,
  onExplain,
  onAddToFlashcards,
  onCopy,
  disableActions = false,
}: TextSelectionToolbarProps) {
  if (!isVisible || !position) {
    return null;
  }

  return (
    <div
      role="toolbar"
      aria-label="Selected text actions"
      className="fixed z-[70] -translate-x-1/2 -translate-y-full rounded-xl border border-slate-700/90 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur"
      style={{ left: position.left, top: position.top }}
      onMouseDown={(event) => event.preventDefault()}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onExplain}
          disabled={disableActions}
          className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Explain
        </button>
        <button
          type="button"
          onClick={onAddToFlashcards}
          disabled={disableActions}
          className="rounded-md bg-amber-600/85 px-2.5 py-1.5 text-xs font-medium text-amber-50 transition-colors hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add to Flashcards
        </button>
        <button
          type="button"
          onClick={onCopy}
          disabled={disableActions}
          className="rounded-md bg-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-100 transition-colors hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Copy
        </button>
      </div>
    </div>
  );
}
