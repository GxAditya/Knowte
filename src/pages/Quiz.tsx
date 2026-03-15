import { useCallback, useEffect, useState } from "react";
import { QuizSkeleton } from "../components/Skeletons";
import { QuizPlayer, QuizResults } from "../components/Quiz";
import { ViewHeader } from "../components/Layout";
import type { UserAnswers } from "../components/Quiz";
import { parseQuizJson } from "../lib/generatedContent";
import { getQuiz, regenerateQuiz, saveQuizAttempt } from "../lib/tauriApi";
import type { Quiz } from "../lib/types";
import { useLectureStore, usePipelineStore, useToastStore } from "../stores";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

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
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-2">
        <span className="text-4xl">🧠</span>
        <p className="text-sm">No knowte selected.</p>
        <p className="text-xs">Add and process a knowte to take a quiz.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-2">
      <span className="text-4xl">🧠</span>
      <p className="text-sm font-medium text-foreground">No quiz generated yet.</p>
      <p className="text-xs">Run the processing pipeline to generate a quiz.</p>
      {detail && (
        <p className="max-w-md rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
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
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
          <p className="font-medium mb-1">Failed to load quiz</p>
          <p className="text-xs opacity-80">{error}</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => void loadQuiz()}
          >
            Retry
          </Button>
          <Button
            onClick={() => void handleRegenerateQuiz()}
            disabled={isRegenerating}
            className="flex items-center gap-2"
          >
            {isRegenerating ? (
              <>
                <Spinner className="mr-2 size-4" />
                Regenerating…
              </>
            ) : (
              "Regenerate Quiz"
            )}
          </Button>
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
            <Button
              onClick={handleRegenerateQuiz}
              disabled={isRegenerating}
              className="flex items-center gap-2"
            >
              {isRegenerating ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Generating…
                </>
              ) : (
                "Generate Quiz"
              )}
            </Button>
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
            <Button
              variant="outline"
              onClick={handleRegenerateQuiz}
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
