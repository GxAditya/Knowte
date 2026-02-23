import { useCallback, useEffect, useState } from "react";
import { FlashcardSkeleton } from "../components/Skeletons";
import { AnkiExport, FlashcardViewer } from "../components/Flashcards";
import { ViewHeader } from "../components/Layout";
import { getFlashcards, regenerateFlashcards } from "../lib/tauriApi";
import type { Flashcard, FlashcardsOutput } from "../lib/types";
import { useLectureStore, useToastStore } from "../stores";

// ─── Empty States ─────────────────────────────────────────────────────────────

function EmptyState({
  reason,
  onRegenerate,
  isRegenerating,
}: {
  reason: "no-lecture" | "no-flashcards";
  onRegenerate?: () => void;
  isRegenerating?: boolean;
}) {
  if (reason === "no-lecture") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)] space-y-2">
        <span className="text-4xl">🃏</span>
        <p className="text-sm">No knowte selected.</p>
        <p className="text-xs">Add and process a knowte to generate flashcards.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)] space-y-4">
      <span className="text-4xl">🃏</span>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-[var(--text-secondary)]">No flashcards generated yet.</p>
        <p className="text-xs">Run the processing pipeline or generate flashcards directly.</p>
      </div>
      {onRegenerate && (
        <button
          type="button"
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="flex items-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-[var(--accent-primary-hover)]"
        >
          {isRegenerating ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating…
            </>
          ) : (
            "Generate Flashcards"
          )}
        </button>
      )}
    </div>
  );
}

// ─── Flashcards Page ──────────────────────────────────────────────────────────

export default function Flashcards() {
  const { currentLectureId } = useLectureStore();
  const pushToast = useToastStore((state) => state.pushToast);

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load flashcards from backend
  const loadFlashcards = useCallback(async (lectureId: string) => {
    setCards([]);
    setError(null);
    setIsLoading(true);

    try {
      const raw = await getFlashcards(lectureId);
      if (raw) {
        const parsed = JSON.parse(raw) as FlashcardsOutput;
        setCards(Array.isArray(parsed.cards) ? parsed.cards : []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentLectureId) return;
    void loadFlashcards(currentLectureId);
  }, [currentLectureId, loadFlashcards]);

  // Regenerate flashcards via LLM
  const handleRegenerate = useCallback(async () => {
    if (!currentLectureId || isRegenerating) return;
    setIsRegenerating(true);
    setError(null);

    try {
      const raw = await regenerateFlashcards(currentLectureId);
      if (raw) {
        const parsed = JSON.parse(raw) as FlashcardsOutput;
        setCards(Array.isArray(parsed.cards) ? parsed.cards : []);
        pushToast({ kind: "success", message: "Flashcards regenerated successfully." });
      } else {
        pushToast({ kind: "warning", message: "Flashcard regeneration returned no data." });
      }
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to regenerate flashcards.");
      pushToast({ kind: "error", message: "Failed to regenerate flashcards." });
    } finally {
      setIsRegenerating(false);
    }
  }, [currentLectureId, isRegenerating, pushToast]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (!currentLectureId) {
    return (
      <div className="mx-auto max-w-[900px] space-y-6">
        <ViewHeader
          title="Flashcards"
          description="Review key terms using active recall cards."
        />
        <EmptyState reason="no-lecture" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[900px] space-y-6">
        <ViewHeader
          title="Flashcards"
          description="Review key terms using active recall cards."
        />
        <FlashcardSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[900px] space-y-6">
        <ViewHeader
          title="Flashcards"
          description="Review key terms using active recall cards."
        />
        <div className="rounded-lg border border-[var(--color-error-muted)] bg-[var(--color-error-muted)] p-4 text-sm text-[var(--color-error)]">
          <p className="font-medium mb-1">Failed to load flashcards</p>
          <p className="text-xs opacity-80">{error}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void loadFlashcards(currentLectureId)}
            className="rounded-md bg-[var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--border-strong)]"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => void handleRegenerate()}
            disabled={isRegenerating}
            className="flex items-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-[var(--accent-primary-hover)]"
          >
            {isRegenerating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Regenerating…
              </>
            ) : (
              "Regenerate Flashcards"
            )}
          </button>
        </div>
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="mx-auto max-w-[900px] space-y-6">
        <ViewHeader
          title="Flashcards"
          description="Review key terms using active recall cards."
          actions={
            <button
              type="button"
              onClick={() => void handleRegenerate()}
              disabled={isRegenerating}
              className="flex items-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-[var(--accent-primary-hover)]"
            >
              {isRegenerating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating…
                </>
              ) : (
                "Generate Flashcards"
              )}
            </button>
          }
        />
        <EmptyState
          reason="no-flashcards"
          onRegenerate={handleRegenerate}
          isRegenerating={isRegenerating}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-[900px] flex-col gap-6">
      <ViewHeader
        title="Flashcards"
        description={`${cards.length} cards generated`}
        actions={
          <button
            type="button"
            onClick={() => void handleRegenerate()}
            disabled={isRegenerating}
            className="flex items-center gap-2 rounded-md bg-[var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] disabled:opacity-60 hover:bg-[var(--border-strong)]"
          >
            {isRegenerating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-transparent" />
                Regenerating…
              </>
            ) : (
              "Regenerate"
            )}
          </button>
        }
      />

      {/* Card Viewer */}
      <FlashcardViewer cards={cards} />

      {/* Export */}
      <AnkiExport lectureId={currentLectureId} cardCount={cards.length} />
    </div>
  );
}
