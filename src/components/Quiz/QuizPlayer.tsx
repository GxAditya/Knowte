import { useCallback, useEffect, useState } from "react";
import { HOTKEY_EVENT_NAMES } from "../../lib/hotkeys";
import type { Question, Quiz } from "../../lib/types";
import { QuestionCard } from "./QuestionCard";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

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
    style += "ring-2 ring-offset-1 ring-offset-background ring-primary ";
  }

  if (!isSubmitted) {
    style += isCurrent ? "bg-primary" : "bg-border";
  } else if (isCorrect === null) {
    style += "bg-yellow-500"; // short answer, self-graded
  } else if (isCorrect) {
    style += "bg-green-500";
  } else {
    style += "bg-destructive";
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
    <div className="w-full h-1.5 bg-card/50 ring-1 ring-border rounded-full overflow-hidden">
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
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{answeredCount} of {total} answered</span>
          <span>{Math.round((answeredCount / total) * 100)}%</span>
        </div>
        <ProgressBar answered={answeredCount} total={total} />
      </div>

      {/* Question card */}
      <div
        className={`bg-card rounded-xl p-8 transition-all duration-300 border ${
          isCurrentSubmitted
            ? answers[currentQuestion.id] === currentQuestion.correct_answer ||
              currentQuestion.type === "short_answer"
              ? "border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
              : "border-destructive/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
            : "border-border hover:shadow-md"
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
        <Button
          variant="ghost"
          type="button"
          onClick={goToPreviousQuestion}
          disabled={currentIndex === 0}
        >
          ← Previous
        </Button>

        <div className="flex gap-2 items-center">
          {!isCurrentSubmitted ? (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!currentAnswer || currentAnswer.trim() === ""}
            >
              Submit Answer
            </Button>
          ) : allSubmitted ? (
            <Button
              type="button"
              onClick={handleFinish}
              className="rounded-full bg-green-600 hover:bg-green-700 text-white shadow"
            >
              See Results →
            </Button>
          ) : (
            <Button
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
              className="flex items-center gap-2"
            >
              Next Question →
            </Button>
          )}
        </div>

        <Button
          variant="ghost"
          type="button"
          onClick={goToNextQuestion}
          disabled={currentIndex === total - 1}
        >
          Next →
        </Button>
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
        <Button
          variant="ghost"
          type="button"
          onClick={onRegenerateQuiz}
          disabled={isRegenerating}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
        >
          {isRegenerating ? (
            <>
              <Spinner className="size-3" />
              Generating new quiz…
            </>
          ) : (
            <>🔄 Generate New Quiz</>
          )}
        </Button>
      </div>
    </div>
  );
}
