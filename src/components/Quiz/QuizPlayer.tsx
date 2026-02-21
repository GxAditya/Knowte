import { useCallback, useEffect, useState } from "react";
import { HOTKEY_EVENT_NAMES } from "../../lib/hotkeys";
import type { Question, Quiz } from "../../lib/types";
import { QuestionCard } from "./QuestionCard";

export interface UserAnswers {
  [questionId: number]: string;
}
export interface SubmittedSet {
  [questionId: number]: boolean;
}

export interface QuizPlayerProps {
  quiz: Quiz;
  onComplete: (answers: UserAnswers, score: number) => void;
  onRegenerateQuiz: () => void;
  isRegenerating: boolean;
}

// ─── Navigation Dot ───────────────────────────────────────────────────────────

interface NavDotProps {
  index: number;
  isCurrent: boolean;
  isSubmitted: boolean;
  isCorrect: boolean | null; // null = short_answer (self-graded)
  onClick: () => void;
}

function NavDot({ index, isCurrent, isSubmitted, isCorrect, onClick }: NavDotProps) {
  let style =
    "w-2.5 h-2.5 rounded-full transition-all duration-200 cursor-pointer hover:scale-125 ";

  if (isCurrent) {
    style += "ring-2 ring-offset-1 ring-offset-[var(--bg-base)] ring-[var(--accent-primary)] ";
  }

  if (!isSubmitted) {
    style += isCurrent ? "bg-[var(--accent-primary)]" : "bg-[var(--border-strong)]";
  } else if (isCorrect === null) {
    style += "bg-[var(--color-warning)]"; // short answer, self-graded
  } else if (isCorrect) {
    style += "bg-[var(--color-success)]";
  } else {
    style += "bg-[var(--color-error)]";
  }

  return (
    <button
      key={index}
      type="button"
      onClick={onClick}
      title={`Question ${index + 1}`}
      className={style}
      aria-label={`Go to question ${index + 1}`}
    />
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function ProgressBar({ answered, total }: { answered: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);
  return (
    <div className="w-full h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
      <div
        className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Helper: is answer correct? ───────────────────────────────────────────────

function isAnswerCorrect(question: Question, answer: string | undefined): boolean | null {
  if (answer === undefined || answer.trim() === "") return false;
  if (question.type === "short_answer") return null; // self-graded
  return answer === question.correct_answer;
}

function calcScore(questions: Question[], answers: UserAnswers): number {
  return questions.filter((q) => {
    const a = answers[q.id];
    if (!a || a.trim() === "") return false;
    if (q.type === "short_answer") return true; // count as attempted = correct
    return a === q.correct_answer;
  }).length;
}

// ─── Quiz Player ──────────────────────────────────────────────────────────────

export function QuizPlayer({ quiz, onComplete, onRegenerateQuiz, isRegenerating }: QuizPlayerProps) {
  const questions = quiz.questions;
  const total = questions.length;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswers>({});
  const [submitted, setSubmitted] = useState<SubmittedSet>({});

  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion.id] ?? null;
  const isCurrentSubmitted = submitted[currentQuestion.id] ?? false;

  const answeredCount = Object.keys(submitted).length;
  const allSubmitted = answeredCount === total;

  function handleAnswerChange(answer: string) {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answer }));
  }

  function handleSubmit() {
    if (!currentAnswer || currentAnswer.trim() === "") return;
    setSubmitted((prev) => ({ ...prev, [currentQuestion.id]: true }));
  }

  function handleFinish() {
    const score = calcScore(questions, answers);
    onComplete(answers, score);
  }

  const goToPreviousQuestion = useCallback(() => {
    setCurrentIndex((index) => Math.max(0, index - 1));
  }, []);

  const goToNextQuestion = useCallback(() => {
    setCurrentIndex((index) => Math.min(total - 1, index + 1));
  }, [total]);

  useEffect(() => {
    const handlePreviousShortcut = () => {
      goToPreviousQuestion();
    };
    const handleNextShortcut = () => {
      goToNextQuestion();
    };

    window.addEventListener(HOTKEY_EVENT_NAMES.previousQuizQuestion, handlePreviousShortcut);
    window.addEventListener(HOTKEY_EVENT_NAMES.nextQuizQuestion, handleNextShortcut);

    return () => {
      window.removeEventListener(HOTKEY_EVENT_NAMES.previousQuizQuestion, handlePreviousShortcut);
      window.removeEventListener(HOTKEY_EVENT_NAMES.nextQuizQuestion, handleNextShortcut);
    };
  }, [goToNextQuestion, goToPreviousQuestion]);

  return (
    <div data-quiz-player="true" className="flex flex-col gap-5 max-w-2xl mx-auto w-full">
      {/* Top bar: progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>{answeredCount} of {total} answered</span>
          <span>{Math.round((answeredCount / total) * 100)}%</span>
        </div>
        <ProgressBar answered={answeredCount} total={total} />
      </div>

      {/* Question card */}
      <div
        className={`bg-[var(--bg-elevated)] border rounded-2xl p-6 transition-all duration-300 ${
          isCurrentSubmitted
            ? answers[currentQuestion.id] === currentQuestion.correct_answer ||
              currentQuestion.type === "short_answer"
              ? "border-[var(--color-success-muted)] shadow-[var(--color-success-muted)] shadow-lg"
              : "border-[var(--color-error)]/40 shadow-red-900/20 shadow-lg"
            : "border-[var(--border-default)] shadow-lg shadow-slate-900/30"
        }`}
      >
        <QuestionCard
          question={currentQuestion}
          questionNumber={currentIndex + 1}
          totalQuestions={total}
          userAnswer={currentAnswer}
          submitted={isCurrentSubmitted}
          onAnswerChange={handleAnswerChange}
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={goToPreviousQuestion}
          disabled={currentIndex === 0}
          className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)]/60 hover:bg-[var(--bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous
        </button>

        <div className="flex gap-2 items-center">
          {!isCurrentSubmitted ? (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!currentAnswer || currentAnswer.trim() === ""}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)] disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
            >
              Submit Answer
            </button>
          ) : allSubmitted ? (
            <button
              type="button"
              onClick={handleFinish}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-[var(--color-success)] hover:bg-[var(--color-success)] text-white transition-colors"
            >
              See Results →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                // Advance to next unanswered question, or next in order
                const nextUnanswered = questions.findIndex(
                  (q, idx) => idx > currentIndex && !submitted[q.id],
                );
                if (nextUnanswered !== -1) {
                  setCurrentIndex(nextUnanswered);
                } else {
                  setCurrentIndex((i) => Math.min(total - 1, i + 1));
                }
              }}
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-[var(--accent-primary)] hover:bg-[var(--accent-primary)] text-white transition-colors"
            >
              Next Question →
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={goToNextQuestion}
          disabled={currentIndex === total - 1}
          className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)]/60 hover:bg-[var(--bg-elevated)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next →
        </button>
      </div>

      {/* Navigation dots */}
      <div className="flex flex-wrap justify-center gap-2 pt-1">
        {questions.map((q, i) => {
          const ans = answers[q.id];
          const isSubmittedQ = submitted[q.id] ?? false;
          const correct = isSubmittedQ ? isAnswerCorrect(q, ans) : false;
          return (
            <NavDot
              key={q.id}
              index={i}
              isCurrent={i === currentIndex}
              isSubmitted={isSubmittedQ}
              isCorrect={isSubmittedQ ? correct : false}
              onClick={() => setCurrentIndex(i)}
            />
          );
        })}
      </div>

      {/* Regenerate quiz */}
      <div className="flex justify-center pt-1">
        <button
          type="button"
          onClick={onRegenerateQuiz}
          disabled={isRegenerating}
          className="flex items-center gap-2 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors disabled:opacity-50"
        >
          {isRegenerating ? (
            <>
              <div className="w-3 h-3 border border-[var(--border-default)] border-t-transparent rounded-full animate-spin" />
              Generating new quiz…
            </>
          ) : (
            <>🔄 Generate New Quiz</>
          )}
        </button>
      </div>
    </div>
  );
}
