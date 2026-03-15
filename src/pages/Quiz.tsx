import { useCallback, useEffect, useState } from "react";
import { QuizSkeleton } from "../components/Skeletons";
import { QuizPlayer, QuizResults } from "../components/Quiz";
import { ViewHeader } from "../components/Layout";
import type { UserAnswers } from "../components/Quiz";
import { parseQuizJson } from "../lib/generatedContent";
import { getQuiz, regenerateQuiz, saveQuizAttempt } from "../lib/tauriApi";
import type { Quiz } from "../lib/types";
import { useLectureStore, usePipelineStore, useToastStore } from "../stores";

// ─── Empty States ─────────────────────────────────────────────────────────────

function EmptyState({
  reason,
  detail,
}: {
  reason: "no-lecture" | "no-quiz";
  detail?: string | null;
}) {
  if (reason === "no-lecture") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)] space-y-2">
        <span className="text-4xl">🧠</span>
        <p className="text-sm">No knowte selected.</p>
        <p className="text-xs">Add and process a knowte to take a quiz.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-64 text-[var(--text-muted)] space-y-2">
      <span className="text-4xl">🧠</span>
      <p className="text-sm font-medium text-[var(--text-secondary)]">No quiz generated yet.</p>
      <p className="text-xs">Run the processing pipeline to generate a quiz.</p>
      {detail && (
        <p className="max-w-md rounded-lg border border-[var(--color-error-muted)] bg-[var(--color-error-muted)] px-4 py-2 text-center text-xs text-[var(--color-error)]">
          {detail}
        </p>
      )}
    </div>
  );
}

// ─── Quiz Page ────────────────────────────────────────────────────────────────

export default function Quiz() {
  const { currentLectureId } = useLectureStore();
  const pushToast = useToastStore((state) => state.pushToast);
  const quizStageError = usePipelineStore((state) =>
    currentLectureId
      ? state.lectureStates[currentLectureId]?.stages.find((stage) => stage.name === "quiz")
          ?.error ?? null
      : null,
  );

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Results state
  const [showResults, setShowResults] = useState(false);
  const [completedAnswers, setCompletedAnswers] = useState<UserAnswers>({});
  const [completedScore, setCompletedScore] = useState(0);

  const applyQuizPayload = useCallback((raw: string, invalidMessage: string) => {
    const parsed = parseQuizJson(raw);
    if (!parsed) {
      setQuiz(null);
      setError(invalidMessage);
      return false;
    }

    setQuiz(parsed);
    setCompletedAnswers({});
    setCompletedScore(0);
    setShowResults(false);
    return true;
  }, []);

  const loadQuiz = useCallback(async () => {
    if (!currentLectureId) {
      setQuiz(null);
      setError(null);
      setShowResults(false);
      setIsLoading(false);
      return;
    }

    setQuiz(null);
    setError(null);
    setShowResults(false);
    setIsLoading(true);

    try {
      const raw = await getQuiz(currentLectureId);
      if (!raw) {
        setQuiz(null);
        return;
      }

      if (!applyQuizPayload(raw, "Stored quiz data is invalid or incomplete.")) {
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [applyQuizPayload, currentLectureId]);

  // ── Load quiz from backend ────────────────────────────────────────────────
  useEffect(() => {
    void loadQuiz();
  }, [loadQuiz]);

  // ── Regenerate quiz ───────────────────────────────────────────────────────
  const handleRegenerateQuiz = useCallback(async () => {
    if (!currentLectureId || isRegenerating) return;
    setIsRegenerating(true);
    setError(null);
    setShowResults(false);

    try {
      const raw = await regenerateQuiz(currentLectureId);
      if (raw) {
        if (applyQuizPayload(raw, "Regenerated quiz data is invalid or incomplete.")) {
          pushToast({ kind: "success", message: "Quiz regenerated successfully." });
        } else {
          pushToast({ kind: "error", message: "Quiz regeneration returned invalid data." });
        }
      } else {
        pushToast({ kind: "warning", message: "Quiz regeneration returned no questions." });
      }
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to regenerate quiz.");
      pushToast({ kind: "error", message: "Failed to regenerate quiz." });
    } finally {
      setIsRegenerating(false);
    }
  }, [applyQuizPayload, currentLectureId, isRegenerating, pushToast]);

  // ── On quiz completed ─────────────────────────────────────────────────────
  const handleQuizComplete = useCallback(
    async (answers: UserAnswers, score: number) => {
      setCompletedAnswers(answers);
      setCompletedScore(score);
      setShowResults(true);

      // Save attempt in background (non-blocking)
      if (currentLectureId) {
        const total = quiz?.questions.length ?? 0;
        saveQuizAttempt(currentLectureId, JSON.stringify(answers), score, total).catch(
          () =>
            pushToast({
              kind: "warning",
              message: "Quiz attempt completed, but saving history failed.",
            }),
        );
      }
    },
    [currentLectureId, quiz, pushToast],
  );

  // ── Retake quiz ──────────────────────────────────────────────────────────
  const handleRetake = useCallback(() => {
    setShowResults(false);
    setCompletedAnswers({});
    setCompletedScore(0);
  }, []);

  const hasQuestions = Boolean(quiz && quiz.questions.length > 0);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!currentLectureId) {
    return (
      <div className="mx-auto max-w-[900px] space-y-6">
        <ViewHeader
          title="Quiz"
          description="Practice key concepts from your knowte."
        />
        <EmptyState reason="no-lecture" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[900px] space-y-6">
        <ViewHeader
          title="Quiz"
          description="Practice key concepts from your knowte."
        />
        <QuizSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[900px] space-y-6">
        <ViewHeader
          title="Quiz"
          description="Practice key concepts from your knowte."
        />
        <div className="rounded-lg border border-[var(--color-error-muted)] bg-[var(--color-error-muted)] p-4 text-[var(--color-error)] text-sm">
          <p className="font-medium mb-1">Failed to load quiz</p>
          <p className="text-xs opacity-80">{error}</p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => void loadQuiz()}
            className="rounded-md bg-[var(--bg-elevated)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--border-strong)]"
          >
            Retry
          </button>
          <button
            type="button"
            onClick={() => void handleRegenerateQuiz()}
            disabled={isRegenerating}
            className="flex items-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-[var(--accent-primary-hover)]"
          >
            {isRegenerating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Regenerating…
              </>
            ) : (
              "Regenerate Quiz"
            )}
          </button>
        </div>
      </div>
    );
  }

  if (!quiz || !hasQuestions) {
    return (
      <div className="mx-auto max-w-[900px] space-y-6">
        <ViewHeader
          title="Quiz"
          description="Practice key concepts from your knowte."
          actions={
            <button
              onClick={handleRegenerateQuiz}
              disabled={isRegenerating}
              className="flex items-center gap-2 rounded-md bg-[var(--accent-primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60 hover:bg-[var(--accent-primary-hover)]"
            >
              {isRegenerating ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generating…
                </>
              ) : (
                "Generate Quiz"
              )}
            </button>
          }
        />
        <EmptyState reason="no-quiz" detail={quizStageError} />
      </div>
    );
  }

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <ViewHeader
        title="Quiz"
        description={`${quiz.questions.length} question${quiz.questions.length !== 1 ? "s" : ""}`}
        actions={
          !showResults ? (
            <button
              onClick={handleRegenerateQuiz}
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
          ) : null
        }
      />

      {/* Quiz player or results */}
      {showResults ? (
        <QuizResults
          quiz={quiz}
          answers={completedAnswers}
          score={completedScore}
          onRetake={handleRetake}
          onRegenerateQuiz={handleRegenerateQuiz}
          isRegenerating={isRegenerating}
        />
      ) : (
        <QuizPlayer
          quiz={quiz}
          onComplete={handleQuizComplete}
          onRegenerateQuiz={handleRegenerateQuiz}
          isRegenerating={isRegenerating}
        />
      )}
    </div>
  );
}
