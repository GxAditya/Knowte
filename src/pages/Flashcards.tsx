import { useCallback, useEffect, useState } from "react";
import { FlashcardSkeleton } from "../components/Skeletons";
import { AnkiExport, FlashcardViewer } from "../components/Flashcards";
import { ViewHeader } from "../components/Layout";
import { parseFlashcardsJson } from "../lib/generatedContent";
import { getFlashcards, regenerateFlashcards } from "../lib/tauriApi";
import type { Flashcard } from "../lib/types";
import { useLectureStore, usePipelineStore, useToastStore } from "../stores";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

// ─── Empty States ─────────────────────────────────────────────────────────────

function EmptyState({
  reason,
  onRegenerate,
  isRegenerating,
  detail,
}: {
  reason: "no-lecture" | "no-flashcards";
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  detail?: string | null;
}) {
  if (reason === "no-lecture") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-2">
        <span className="text-4xl">🃏</span>
        <p className="text-sm">No knowte selected.</p>
        <p className="text-xs">Add and process a knowte to generate flashcards.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-4">
      <span className="text-4xl">🃏</span>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">No flashcards generated yet.</p>
        <p className="text-xs">Run the processing pipeline or generate flashcards directly.</p>
      </div>
      {detail && (
        <p className="max-w-md rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
          {detail}
        </p>
      )}
      {onRegenerate && (
        <Button
          onClick={onRegenerate}
          disabled={isRegenerating}
          className="flex items-center gap-2"
        >
          {isRegenerating ? (
            <>
              <Spinner className="mr-2 size-4" />
              Generating…
            </>
          ) : (
            "Generate Flashcards"
          )}
        </Button>
      )}
    </div>
  );
}

// ─── Flashcards Page ──────────────────────────────────────────────────────────

export default function Flashcards() {
  const { currentLectureId } = useLectureStore();
  const pushToast = useToastStore((state) => state.pushToast);
  const flashcardsStageError = usePipelineStore((state) =>
    currentLectureId
      ? state.lectureStates[currentLectureId]?.stages.find((stage) => stage.name === "flashcards")
        ?.error ?? null
      : null,
  );

  const [cards, setCards] = useState<Flashcard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyFlashcardsPayload = useCallback((raw: string, invalidMessage: string) => {
    const parsed = parseFlashcardsJson(raw);
    if (!parsed) {
      setCards([]);
      setError(invalidMessage);
      return false;
    }

    setCards(parsed.cards);
    return true;
  }, []);

  // Load flashcards from backend
  const loadFlashcards = useCallback(async (lectureId: string) => {
    setCards([]);
    setError(null);
    setIsLoading(true);

    try {
      const raw = await getFlashcards(lectureId);
      if (raw) {
        applyFlashcardsPayload(raw, "Stored flashcards data is invalid or incomplete.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsLoading(false);
    }
  }, [applyFlashcardsPayload]);

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
        if (applyFlashcardsPayload(raw, "Regenerated flashcards data is invalid or incomplete.")) {
          pushToast({ kind: "success", message: "Flashcards regenerated successfully." });
        } else {
          pushToast({ kind: "error", message: "Flashcard regeneration returned invalid data." });
        }
      } else {
        pushToast({ kind: "warning", message: "Flashcard regeneration returned no data." });
      }
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to regenerate flashcards.");
      pushToast({ kind: "error", message: "Failed to regenerate flashcards." });
    } finally {
      setIsRegenerating(false);
    }
  }, [applyFlashcardsPayload, currentLectureId, isRegenerating, pushToast]);

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
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <p className="font-medium mb-1">Failed to load flashcards</p>
          <p className="text-xs opacity-80">{error}</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => void loadFlashcards(currentLectureId)}
          >
            Retry
          </Button>
          <Button
            onClick={() => void handleRegenerate()}
            disabled={isRegenerating}
            className="flex items-center gap-2"
          >
            {isRegenerating ? (
              <>
                <Spinner className="mr-2 size-4" />
                Regenerating…
              </>
            ) : (
              "Regenerate Flashcards"
            )}
          </Button>
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
            <Button
              onClick={() => void handleRegenerate()}
              disabled={isRegenerating}
              className="flex items-center gap-2"
            >
              {isRegenerating ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Generating…
                </>
              ) : (
                "Generate Flashcards"
              )}
            </Button>
          }
        />
        <EmptyState
          reason="no-flashcards"
          detail={flashcardsStageError}
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
          <Button
            variant="outline"
            onClick={() => void handleRegenerate()}
            disabled={isRegenerating}
            className="flex items-center gap-2"
          >
            {isRegenerating ? (
              <>
                <Spinner className="mr-2 size-4" />
                Regenerating…
              </>
            ) : (
              "Regenerate"
            )}
          </Button>
        }
      />

      {/* Card Viewer */}
      <FlashcardViewer cards={cards} />

      {/* Export */}
      <AnkiExport lectureId={currentLectureId} cardCount={cards.length} />
    </div>
  );
}
