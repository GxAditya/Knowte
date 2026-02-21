import type { Question, QuestionDifficulty } from "../../lib/types";

// ─── Difficulty Badge ─────────────────────────────────────────────────────────

const DIFFICULTY_STYLES: Record<QuestionDifficulty, string> = {
  easy: "bg-[var(--color-success-muted)] text-[var(--color-success)] border border-[var(--color-success-muted)]",
  medium: "bg-[var(--color-warning-muted)] text-[var(--color-warning)] border border-[var(--color-warning-muted)]",
  hard: "bg-[var(--color-error-muted)] text-[var(--color-error)] border border-[var(--color-error)]/40",
};

function DifficultyBadge({ difficulty }: { difficulty: QuestionDifficulty }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${DIFFICULTY_STYLES[difficulty]}`}
    >
      {difficulty}
    </span>
  );
}

// ─── Multiple Choice Input ────────────────────────────────────────────────────

interface MultipleChoiceProps {
  options: string[];
  selected: string | null;
  submitted: boolean;
  correctAnswer: string;
  onSelect: (option: string) => void;
}

function MultipleChoiceInput({
  options,
  selected,
  submitted,
  correctAnswer,
  onSelect,
}: MultipleChoiceProps) {
  return (
    <div className="space-y-2.5 mt-5">
      {options.map((option, i) => {
        const isSelected = selected === option;
        const isCorrect = option === correctAnswer;

        let cardStyle =
          "border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-elevated)]";

        if (submitted) {
          if (isCorrect) {
            cardStyle = "border border-[var(--color-success)] bg-[var(--color-success-muted)] text-[var(--color-success)]";
          } else if (isSelected && !isCorrect) {
            cardStyle = "border border-[var(--color-error)] bg-[var(--color-error-muted)] text-[var(--color-error)]";
          } else {
            cardStyle = "border border-[var(--border-default)]/50 bg-[var(--bg-elevated)]/30 text-[var(--text-muted)]";
          }
        } else if (isSelected) {
          cardStyle = "border border-[var(--accent-primary)] bg-[var(--accent-glow)] text-[var(--text-primary)]";
        }

        return (
          <button
            key={i}
            onClick={() => !submitted && onSelect(option)}
            disabled={submitted}
            className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-150 ${cardStyle} ${!submitted ? "cursor-pointer" : "cursor-default"}`}
          >
            <span
              className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs font-bold ${
                submitted && isCorrect
                  ? "border-[var(--color-success)] bg-[var(--color-success)] text-white"
                  : submitted && isSelected && !isCorrect
                    ? "border-[var(--color-error)] bg-[var(--color-error)] text-white"
                    : isSelected
                      ? "border-[var(--accent-primary)] bg-[var(--accent-primary)] text-white"
                      : "border-[var(--border-strong)]"
              }`}
            >
              {submitted && isCorrect ? "✓" : submitted && isSelected && !isCorrect ? "✗" : ""}
            </span>
            <span className="text-sm leading-relaxed">{option}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─── True / False Input ───────────────────────────────────────────────────────

interface TrueFalseProps {
  selected: string | null;
  submitted: boolean;
  correctAnswer: string;
  onSelect: (value: string) => void;
}

function TrueFalseInput({ selected, submitted, correctAnswer, onSelect }: TrueFalseProps) {
  const options = ["True", "False"];

  return (
    <div className="flex gap-4 mt-5">
      {options.map((option) => {
        const isSelected = selected === option;
        const isCorrect = option === correctAnswer;

        let style =
          "flex-1 py-4 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:border-[var(--accent-primary)] hover:bg-[var(--bg-elevated)] font-semibold text-base transition-all duration-150";

        if (submitted) {
          if (isCorrect) {
            style =
              "flex-1 py-4 rounded-xl border border-[var(--color-success)] bg-[var(--color-success-muted)] text-[var(--color-success)] font-semibold text-base";
          } else if (isSelected && !isCorrect) {
            style =
              "flex-1 py-4 rounded-xl border border-[var(--color-error)] bg-[var(--color-error-muted)] text-[var(--color-error)] font-semibold text-base";
          } else {
            style =
              "flex-1 py-4 rounded-xl border border-[var(--border-default)]/50 bg-[var(--bg-elevated)]/30 text-[var(--text-muted)] font-semibold text-base";
          }
        } else if (isSelected) {
          style =
            "flex-1 py-4 rounded-xl border border-[var(--accent-primary)] bg-[var(--accent-glow)] text-[var(--text-primary)] font-semibold text-base";
        }

        return (
          <button
            key={option}
            onClick={() => !submitted && onSelect(option)}
            disabled={submitted}
            className={`${style} ${!submitted ? "cursor-pointer" : "cursor-default"}`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

// ─── Short Answer Input ───────────────────────────────────────────────────────

interface ShortAnswerProps {
  value: string;
  submitted: boolean;
  correctAnswer: string;
  onChange: (value: string) => void;
}

function ShortAnswerInput({ value, submitted, correctAnswer, onChange }: ShortAnswerProps) {
  return (
    <div className="mt-5 space-y-2">
      <textarea
        value={value}
        onChange={(e) => !submitted && onChange(e.target.value)}
        disabled={submitted}
        placeholder="Type your answer here…"
        rows={3}
        className={`w-full px-4 py-3 rounded-lg border text-sm leading-relaxed resize-none transition-colors focus:outline-none ${
          submitted
            ? "border-[var(--border-strong)] bg-[var(--bg-elevated)]/30 text-[var(--text-muted)] cursor-default"
            : "border-[var(--border-strong)] bg-[var(--bg-elevated)] text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-[var(--accent-primary)] focus:ring-1 focus:ring-[var(--accent-primary)]"
        }`}
      />
      {submitted && (
        <p className="text-xs text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--color-success)]">Model answer: </span>
          {correctAnswer}
        </p>
      )}
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────

export interface QuestionCardProps {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  userAnswer: string | null;
  submitted: boolean;
  onAnswerChange: (answer: string) => void;
}

export function QuestionCard({
  question,
  questionNumber,
  totalQuestions,
  userAnswer,
  submitted,
  onAnswerChange,
}: QuestionCardProps) {
  const correct = submitted && userAnswer === question.correct_answer;
  const incorrect = submitted && userAnswer !== null && userAnswer !== question.correct_answer;

  return (
    <div className="w-full">
      {/* Header row */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-[var(--text-muted)] font-medium">
          Question {questionNumber} of {totalQuestions}
        </span>
        <DifficultyBadge difficulty={question.difficulty} />
      </div>

      {/* Question text */}
      <p className="text-[var(--text-primary)] text-lg font-medium leading-relaxed mb-1">
        {question.question}
      </p>

      {/* Inputs */}
      {question.type === "multiple_choice" && question.options && (
        <MultipleChoiceInput
          options={question.options}
          selected={userAnswer}
          submitted={submitted}
          correctAnswer={question.correct_answer}
          onSelect={onAnswerChange}
        />
      )}

      {question.type === "true_false" && (
        <TrueFalseInput
          selected={userAnswer}
          submitted={submitted}
          correctAnswer={question.correct_answer}
          onSelect={onAnswerChange}
        />
      )}

      {question.type === "short_answer" && (
        <ShortAnswerInput
          value={userAnswer ?? ""}
          submitted={submitted}
          correctAnswer={question.correct_answer}
          onChange={onAnswerChange}
        />
      )}

      {/* Post-submit feedback */}
      {submitted && (
        <div
          className={`mt-5 rounded-lg p-4 border transition-all duration-300 ${
            correct
              ? "bg-[var(--color-success-muted)] border-[var(--color-success-muted)]"
              : incorrect
                ? "bg-[var(--color-error-muted)] border-[var(--color-error-muted)]"
                : "bg-[var(--bg-elevated)] border-[var(--border-default)]/50"
          }`}
        >
          {correct && (
            <p className="text-[var(--color-success)] font-semibold text-sm mb-1.5">✓ Correct!</p>
          )}
          {incorrect && (
            <div className="mb-1.5">
              <p className="text-[var(--color-error)] font-semibold text-sm">✗ Incorrect</p>
              {question.type !== "short_answer" && (
                <p className="text-[var(--text-secondary)] text-sm mt-1">
                  Correct answer:{" "}
                  <span className="font-semibold text-[var(--color-success)]">
                    {question.correct_answer}
                  </span>
                </p>
              )}
            </div>
          )}
          {!submitted || (!correct && !incorrect) ? null : (
            <p className="text-[var(--text-secondary)] text-sm leading-relaxed mt-1">
              <span className="text-[var(--text-muted)] font-medium">Explanation: </span>
              {question.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
