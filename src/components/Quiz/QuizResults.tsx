import { useState } from "react";
import type { Question, Quiz } from "../../lib/types";
import type { UserAnswers } from "./QuizPlayer";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

// ─── Circular Progress ────────────────────────────────────────────────────────

interface CircularProgressProps {
  score: number;
  total: number;
}

function CircularProgress({ score, total }: CircularProgressProps) {
  const pct = total === 0 ? 0 : score / total;
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);

  const color =
    pct >= 0.7
      ? { stroke: "var(--color-success)", text: "text-[var(--color-success)]", label: "Excellent!" }
      : pct >= 0.5
        ? { stroke: "var(--color-warning)", text: "text-[var(--color-warning)]", label: "Good effort!" }
        : { stroke: "var(--color-error)", text: "text-[var(--color-error)]", label: "Keep practicing" };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <svg
          aria-hidden="true"
          width="132"
          height="132"
          viewBox="0 0 132 132"
          className="-rotate-90"
        >
          {/* Background circle */}
          <circle
            cx="66"
            cy="66"
            r={radius}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="10"
          />
          {/* Progress arc */}
          <circle
            cx="66"
            cy="66"
            r={radius}
            fill="none"
            stroke={color.stroke}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700"
          />
        </svg>
        {/* Score label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold ${color.text}`}>{score}</span>
          <span className="text-muted-foreground text-sm">/ {total}</span>
        </div>
      </div>
      <p className={`text-sm font-semibold ${color.text}`}>{color.label}</p>
      <p className="text-foreground text-base font-medium">
        {Math.round(pct * 100)}% correct
      </p>
    </div>
  );
}

// ─── Question Row (expandable) ────────────────────────────────────────────────

interface QuestionRowProps {
  question: Question;
  userAnswer: string | undefined;
  index: number;
}

function QuestionRow({ question, userAnswer, index }: QuestionRowProps) {
  const [expanded, setExpanded] = useState(false);

  const isShortAnswer = question.type === "short_answer";
  const correct = isShortAnswer
    ? userAnswer !== undefined && userAnswer.trim() !== ""
    : userAnswer === question.correct_answer;

  return (
    <div
      className={`rounded-lg border transition-colors ${
        correct
          ? "border-green-500/20 bg-green-500/10"
          : "border-destructive/20 bg-destructive/10"
      }`}
    >
      <button
        onClick={() => !correct && setExpanded((e) => !e)}
        className={`w-full flex items-start gap-3 px-4 py-3 text-left ${!correct ? "cursor-pointer" : "cursor-default"}`}
      >
        <span
          className={`shrink-0 mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
            correct
              ? "bg-green-500 text-white"
              : "bg-destructive text-destructive-foreground"
          }`}
        >
          {correct ? "✓" : "✗"}
        </span>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-foreground leading-snug">
            <span className="text-muted-foreground mr-1.5">Q{index + 1}.</span>
            {question.question}
          </p>
          {!correct && !expanded && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Click to see explanation
            </p>
          )}
        </div>

        {!correct && (
          <span className="shrink-0 text-muted-foreground text-sm">
            {expanded ? "▲" : "▼"}
          </span>
        )}
      </button>

      {/* Expanded explanation for wrong answers */}
      {!correct && expanded && (
        <div className="px-4 pb-4 pt-0 pl-12 space-y-1.5">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">Your answer: </span>
            {userAnswer && userAnswer.trim() !== "" ? (
              <span className="text-destructive">{userAnswer}</span>
            ) : (
              <span className="italic text-muted-foreground">Not answered</span>
            )}
          </p>
          {!isShortAnswer && (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Correct answer: </span>
              <span className="text-green-600">{question.correct_answer}</span>
            </p>
          )}
          <p className="text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Explanation: </span>
            {question.explanation}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Quiz Results ─────────────────────────────────────────────────────────────

export interface QuizResultsProps {
  quiz: Quiz;
  answers: UserAnswers;
  score: number;
  onRetake: () => void;
  onRegenerateQuiz: () => void;
  isRegenerating: boolean;
}

export function QuizResults({
  quiz,
  answers,
  score,
  onRetake,
  onRegenerateQuiz,
  isRegenerating,
}: QuizResultsProps) {
  const questions = quiz.questions;
  const total = questions.length;

  return (
    <div className="max-w-2xl mx-auto w-full space-y-8">
      {/* Score card */}
      <div className="bg-card border border-border rounded-2xl p-8 flex flex-col items-center gap-6 shadow-xl shadow-slate-900/10">
        <h2 className="text-2xl font-bold text-foreground">Quiz Complete!</h2>
        <CircularProgress score={score} total={total} />

        {/* Action buttons */}
        <div className="flex gap-3 flex-wrap justify-center">
          <Button
            onClick={onRetake}
            className="flex items-center gap-2 rounded-lg"
          >
            🔁 Retake Quiz
          </Button>
          <Button
            variant="secondary"
            onClick={onRegenerateQuiz}
            disabled={isRegenerating}
            className="flex items-center gap-2 rounded-lg"
          >
            {isRegenerating ? (
              <>
                <Spinner className="mr-2 size-4" />
                Generating…
              </>
            ) : (
              <>✨ Generate New Quiz</>
            )}
          </Button>
        </div>
      </div>

      {/* Question review list */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-foreground">Question Review</h3>
        <div className="space-y-2">
          {questions.map((q, i) => (
            <QuestionRow
              key={q.id}
              question={q}
              userAnswer={answers[q.id]}
              index={i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
