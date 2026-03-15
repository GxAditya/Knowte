import type { Question, QuestionDifficulty } from "../../lib/types";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";

// ─── Difficulty Badge ─────────────────────────────────────────────────────────

function DifficultyBadge({ difficulty }: { difficulty: QuestionDifficulty }) {
  const variant =
    difficulty === "easy"
      ? "secondary" 
      : difficulty === "medium"
        ? "outline" 
        : "destructive";
  
  return (
    <Badge
      variant={variant as any}
      className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide
        ${difficulty === "easy" ? "bg-green-500/20 text-green-600 hover:bg-green-500/30" : ""}
        ${difficulty === "medium" ? "bg-yellow-500/20 text-yellow-600 border-yellow-500/30 hover:bg-yellow-500/30" : ""}
      `}
    >
      {difficulty}
    </Badge>
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
          "border border-border bg-card text-muted-foreground hover:border-primary hover:bg-accent";

        if (submitted) {
          if (isCorrect) {
            cardStyle = "border border-green-500 bg-green-500/10 text-green-600";
          } else if (isSelected && !isCorrect) {
            cardStyle = "border border-destructive bg-destructive/10 text-destructive";
          } else {
            cardStyle = "border border-border/50 bg-card/50 text-muted-foreground opacity-50";
          }
        } else if (isSelected) {
          cardStyle = "border border-primary bg-primary/10 text-foreground ring-1 ring-primary";
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
                  ? "border-green-500 bg-green-500 text-white"
                  : submitted && isSelected && !isCorrect
                    ? "border-destructive bg-destructive text-destructive-foreground"
                    : isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border"
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
          "flex-1 py-4 rounded-xl border border-border bg-card text-muted-foreground hover:border-primary hover:bg-accent font-semibold text-base transition-all duration-150";

        if (submitted) {
          if (isCorrect) {
            style =
              "flex-1 py-4 rounded-xl border border-green-500 bg-green-500/10 text-green-600 font-semibold text-base";
          } else if (isSelected && !isCorrect) {
            style =
              "flex-1 py-4 rounded-xl border border-destructive bg-destructive/10 text-destructive font-semibold text-base";
          } else {
            style =
              "flex-1 py-4 rounded-xl border border-border/50 bg-card/50 text-muted-foreground font-semibold text-base opacity-50";
          }
        } else if (isSelected) {
          style =
            "flex-1 py-4 rounded-xl border border-primary bg-primary/10 text-foreground font-semibold text-base ring-1 ring-primary";
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
      <Textarea
        value={value}
        onChange={(e) => !submitted && onChange(e.target.value)}
        disabled={submitted}
        placeholder="Type your answer here…"
        rows={3}
        className={`w-full px-4 py-3 rounded-lg border text-sm leading-relaxed resize-none transition-colors focus:outline-none focus:ring-1 ${
          submitted
            ? "border-border bg-muted/30 text-muted-foreground cursor-default"
            : "border-input bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-primary"
        }`}
      />
      {submitted && (
        <p className="text-xs text-muted-foreground">
          <span className="font-semibold text-green-600">Model answer: </span>
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
        <span className="text-sm text-muted-foreground font-medium">
          Question {questionNumber} of {totalQuestions}
        </span>
        <DifficultyBadge difficulty={question.difficulty} />
      </div>

      {/* Question text */}
      <p className="text-foreground text-lg font-medium leading-relaxed mb-1">
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
              ? "bg-green-500/10 border-green-500/20"
              : incorrect
                ? "bg-destructive/10 border-destructive/20"
                : "bg-card border-border/50"
          }`}
        >
          {correct && (
            <p className="text-green-600 font-semibold text-sm mb-1.5">✓ Correct!</p>
          )}
          {incorrect && (
            <div className="mb-1.5">
              <p className="text-destructive font-semibold text-sm">✗ Incorrect</p>
              {question.type !== "short_answer" && (
                <p className="text-muted-foreground text-sm mt-1">
                  Correct answer:{" "}
                  <span className="font-semibold text-green-600">
                    {question.correct_answer}
                  </span>
                </p>
              )}
            </div>
          )}
          {!submitted || (!correct && !incorrect) ? null : (
            <p className="text-muted-foreground text-sm leading-relaxed mt-1">
              <span className="font-medium">Explanation: </span>
              {question.explanation}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
