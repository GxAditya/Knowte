import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { List, type RowComponentProps } from "react-window";
import { HOTKEY_EVENT_NAMES } from "../../lib/hotkeys";
import type { Flashcard } from "../../lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Types ─────────────────────────────────────────────────────────────────

type Pile = "known" | "almost" | "unknown" | "unsorted";

interface CardState {
  card: Flashcard;
  originalIndex: number;
  pile: Pile;
}

interface StudyStats {
  known: number;
  almost: number;
  unknown: number;
}

interface VirtualizedCardIndexProps {
  cards: CardState[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

interface VirtualizedRowProps {
  cards: CardState[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  return prefersReducedMotion;
}

// ─── Individual Card ────────────────────────────────────────────────────────

interface FlashcardProps {
  card: Flashcard;
  isFlipped: boolean;
  prefersReducedMotion: boolean;
  onFlip: () => void;
}

function FlashcardDisplay({
  card,
  isFlipped,
  prefersReducedMotion,
  onFlip,
}: FlashcardProps) {
  const front = typeof card.front === "string" && card.front.trim().length > 0
    ? card.front
    : "Untitled card";
  const back = typeof card.back === "string" ? card.back : "";
  const tags = Array.isArray(card.tags)
    ? card.tags.filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
    : [];
  const containerStyle: CSSProperties = prefersReducedMotion
    ? {
        minHeight: "300px",
        height: "clamp(300px, 40vh, 480px)",
      }
    : {
        perspective: "1200px",
        minHeight: "300px",
        height: "clamp(300px, 40vh, 480px)",
      };

  const cardStyle: CSSProperties = prefersReducedMotion
    ? {
        minHeight: "300px",
        height: "100%",
      }
    : {
        transformStyle: "preserve-3d",
        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
        minHeight: "300px",
        height: "100%",
      };

  return (
    <div
      className="relative w-full cursor-pointer select-none"
      style={containerStyle}
      onClick={onFlip}
      role="button"
      tabIndex={0}
      aria-label={isFlipped ? "Card back — click to flip to front" : "Card front — click to flip to back"}
      aria-pressed={isFlipped}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onFlip();
        }
      }}
    >
      <div
        className={`relative w-full h-full ${
          prefersReducedMotion ? "transition-opacity duration-200" : "transition-transform duration-500"
        }`}
        style={cardStyle}
      >
        {/* Front */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-start bg-card border border-border shadow-sm rounded-2xl p-8 transition-transform duration-500 overflow-y-auto"
          style={
            prefersReducedMotion
              ? {
                  opacity: isFlipped ? 0 : 1,
                  pointerEvents: isFlipped ? "none" : "auto",
                }
              : { backfaceVisibility: "hidden" }
          }
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4 shrink-0">
            Front
          </span>
          <p className="text-base font-medium text-foreground text-center leading-relaxed w-full break-words">
            {front}
          </p>
          <span className="mt-6 text-xs text-muted-foreground shrink-0">Click to reveal answer</span>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-start bg-card border border-primary/30 shadow-md rounded-2xl p-8 transition-transform duration-500 overflow-y-auto"
          style={{
            ...(prefersReducedMotion
              ? {
                  opacity: isFlipped ? 1 : 0,
                  pointerEvents: isFlipped ? "auto" : "none",
                }
              : {
                  backfaceVisibility: "hidden",
                  transform: "rotateY(180deg)",
                }),
          }}
        >
          <span className="text-xs font-semibold uppercase tracking-widest text-primary mb-4 shrink-0">
            Back
          </span>
          <p className="text-base font-medium text-foreground text-center leading-relaxed w-full break-words">
            {back}
          </p>
          {tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-5">
              {tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="default"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Study Mode End Screen ───────────────────────────────────────────────────

interface StudyCompleteProps {
  stats: StudyStats;
  total: number;
  onReviewAll: () => void;
  onReviewWeak: () => void;
}

function StudyComplete({ stats, total, onReviewAll, onReviewWeak }: StudyCompleteProps) {
  const weakCount = stats.almost + stats.unknown;
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      <div className="text-5xl">🎉</div>
      <h2 className="text-2xl font-bold text-foreground">Round Complete!</h2>
      <div className="flex gap-6 text-center">
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold text-green-500">{stats.known}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Know it</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold text-amber-500">{stats.almost}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Almost</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold text-destructive">{stats.unknown}</span>
          <span className="text-xs text-muted-foreground uppercase tracking-wide mt-1">No clue</span>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        You know {stats.known} of {total} cards ({Math.round((stats.known / total) * 100)}%)
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        {weakCount > 0 && (
          <Button
            variant="ghost"
            type="button"
            onClick={onReviewWeak}
            className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
          >
            Review weak cards ({weakCount})
          </Button>
        )}
        <Button
          variant="secondary"
          type="button"
          onClick={onReviewAll}
        >
          Review all again
        </Button>
      </div>
    </div>
  );
}

function VirtualizedCardIndex({
  cards,
  activeIndex,
  onSelect,
}: VirtualizedCardIndexProps) {
  const rowHeight = 32;
  const viewportHeight = 220;

  const Row = ({
    index,
    style,
    cards: rowCards,
    activeIndex: rowActiveIndex,
    onSelect: rowSelect,
  }: RowComponentProps<VirtualizedRowProps>) => {
    const entry = rowCards[index];
    if (!entry) {
      return null;
    }
    const isActive = index === rowActiveIndex;
    return (
      <button
        type="button"
        onClick={() => rowSelect(index)}
        className={`flex w-full items-center justify-between px-2 text-left text-xs transition-colors ${
          isActive ? "bg-primary/20 text-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        }`}
        style={style}
      >
        <span className="truncate pr-2">
          {index + 1}. {typeof entry.card.front === "string" && entry.card.front.trim().length > 0
            ? entry.card.front
            : "Untitled card"}
        </span>
        <span className="text-[10px] uppercase text-muted-foreground">{entry.pile}</span>
      </button>
    );
  };

  return (
    <div className="bg-card border border-border shadow-sm rounded-lg p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Card Index (Virtualized)
        </p>
        <p className="text-[11px] text-muted-foreground">{cards.length} cards</p>
      </div>
      <List
        className="rounded-md border border-border bg-background/40 shadow-inner"
        rowComponent={Row}
        rowCount={cards.length}
        rowHeight={rowHeight}
        rowProps={{ cards, activeIndex, onSelect }}
        overscanCount={6}
        style={{ height: viewportHeight }}
      />
    </div>
  );
}

// ─── Flashcard Viewer ────────────────────────────────────────────────────────

interface FlashcardViewerProps {
  cards: Flashcard[];
}

export default function FlashcardViewer({ cards }: FlashcardViewerProps) {
  const [cardStates, setCardStates] = useState<CardState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [studyMode, setStudyMode] = useState(false);
  const [studyComplete, setStudyComplete] = useState(false);
  const [stats, setStats] = useState<StudyStats>({ known: 0, almost: 0, unknown: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  // Initialize card states
  useEffect(() => {
    setCardStates(
      cards.map((card, i) => ({ card, originalIndex: i, pile: "unsorted" })),
    );
    setCurrentIndex(0);
    setIsFlipped(false);
    setStudyMode(false);
    setStudyComplete(false);
    setStats({ known: 0, almost: 0, unknown: 0 });
  }, [cards]);

  const currentCard = cardStates[currentIndex];
  const transitionDelayMs = prefersReducedMotion ? 0 : 150;

  const goNext = useCallback(() => {
    setIsFlipped(false);
    setTimeout(
      () => setCurrentIndex((index) => Math.min(index + 1, cardStates.length - 1)),
      transitionDelayMs,
    );
  }, [cardStates.length, transitionDelayMs]);

  const goPrev = useCallback(() => {
    setIsFlipped(false);
    setTimeout(
      () => setCurrentIndex((index) => Math.max(index - 1, 0)),
      transitionDelayMs,
    );
  }, [transitionDelayMs]);

  // Keyboard flip support
  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setIsFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  useEffect(() => {
    const handlePreviousShortcut = () => {
      goPrev();
    };
    const handleNextShortcut = () => {
      goNext();
    };

    window.addEventListener(HOTKEY_EVENT_NAMES.previousFlashcard, handlePreviousShortcut);
    window.addEventListener(HOTKEY_EVENT_NAMES.nextFlashcard, handleNextShortcut);
    return () => {
      window.removeEventListener(HOTKEY_EVENT_NAMES.previousFlashcard, handlePreviousShortcut);
      window.removeEventListener(HOTKEY_EVENT_NAMES.nextFlashcard, handleNextShortcut);
    };
  }, [goNext, goPrev]);

  const shuffle = () => {
    setIsFlipped(false);
    setCurrentIndex(0);
    setCardStates((prev) => {
      const arr = [...prev];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    });
  };

  const startStudyMode = () => {
    setStudyMode(true);
    setStudyComplete(false);
    setCurrentIndex(0);
    setIsFlipped(false);
    setStats({ known: 0, almost: 0, unknown: 0 });
    setCardStates((prev) => prev.map((cs) => ({ ...cs, pile: "unsorted" })));
  };

  const endStudyMode = () => {
    setStudyMode(false);
    setStudyComplete(false);
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const sortCard = (pile: "known" | "almost" | "unknown") => {
    const newStats = { ...stats, [pile]: stats[pile] + 1 };
    const nextIndex = currentIndex + 1;

    setCardStates((prev) =>
      prev.map((cs, i) => (i === currentIndex ? { ...cs, pile } : cs)),
    );

    if (nextIndex >= cardStates.length) {
      setStats(newStats);
      setStudyComplete(true);
    } else {
      setStats(newStats);
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(nextIndex), transitionDelayMs);
    }
  };

  const reviewWeak = () => {
    const weak = cardStates.filter((cs) => cs.pile === "almost" || cs.pile === "unknown");
    setCardStates(weak.map((cs) => ({ ...cs, pile: "unsorted" })));
    setCurrentIndex(0);
    setIsFlipped(false);
    setStudyComplete(false);
    setStats({ known: 0, almost: 0, unknown: 0 });
  };

  const reviewAll = () => {
    setCardStates((prev) => prev.map((cs) => ({ ...cs, pile: "unsorted" })));
    setCurrentIndex(0);
    setIsFlipped(false);
    setStudyComplete(false);
    setStats({ known: 0, almost: 0, unknown: 0 });
  };

  if (cardStates.length === 0) return null;

  return (
    <div ref={containerRef} className="flex flex-col h-full gap-4" style={{ outline: "none" }}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-medium">
            {studyMode ? "Study Mode" : "Browse Mode"}
          </span>
          {studyMode && !studyComplete && (
            <span className="text-xs text-muted-foreground">
              {currentIndex + 1} / {cardStates.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!studyMode && (
            <>
              <Button
                variant="ghost"
                type="button"
                onClick={shuffle}
                className="flex items-center gap-1.5 h-8 text-xs"
                title="Shuffle cards"
              >
                <svg
                  aria-hidden="true"
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="16 3 21 3 21 8" />
                  <line x1="4" y1="20" x2="21" y2="3" />
                  <polyline points="21 16 21 21 16 21" />
                  <line x1="15" y1="15" x2="21" y2="21" />
                </svg>
                Shuffle
              </Button>
              <Button
                type="button"
                onClick={startStudyMode}
                className="flex items-center gap-1.5 h-8 text-xs"
              >
                Study Mode
              </Button>
            </>
          )}
          {studyMode && (
            <Button
              variant="ghost"
              type="button"
              onClick={endStudyMode}
              className="flex items-center gap-1.5 h-8 text-xs"
            >
              Exit Study Mode
            </Button>
          )}
        </div>
      </div>

      {/* ── Study Complete Screen ── */}
      {studyMode && studyComplete ? (
        <StudyComplete
          stats={stats}
          total={cardStates.length}
          onReviewAll={reviewAll}
          onReviewWeak={reviewWeak}
        />
      ) : (
        <>
          {/* ── Card Counter (browse mode) ── */}
          {!studyMode && (
            <div className="text-center text-xs text-muted-foreground">
              Card {currentIndex + 1} of {cardStates.length}
            </div>
          )}

          {/* ── Card ── */}
          {currentCard && (
            <FlashcardDisplay
              card={currentCard.card}
              isFlipped={isFlipped}
              prefersReducedMotion={prefersReducedMotion}
              onFlip={() => setIsFlipped((f) => !f)}
            />
          )}

          {/* ── Tags (browse mode, shown below card front) ── */}
          {!studyMode && !isFlipped && currentCard?.card.tags.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {currentCard.card.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          {/* ── Navigation (browse mode) ── */}
          {!studyMode && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                type="button"
                onClick={goPrev}
                disabled={currentIndex === 0}
                className="flex items-center gap-1.5"
              >
                <svg
                  aria-hidden="true"
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Previous
              </Button>
              <Button
                variant="secondary"
                type="button"
                onClick={() => setIsFlipped((f) => !f)}
              >
                {isFlipped ? "Hide answer" : "Show answer"}
              </Button>
              <Button
                variant="ghost"
                type="button"
                onClick={goNext}
                disabled={currentIndex === cardStates.length - 1}
                className="flex items-center gap-1.5"
              >
                Next
                <svg
                  aria-hidden="true"
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Button>
            </div>
          )}

          {!studyMode && cardStates.length >= 80 && (
            <VirtualizedCardIndex
              cards={cardStates}
              activeIndex={currentIndex}
              onSelect={(index) => {
                setCurrentIndex(index);
                setIsFlipped(false);
              }}
            />
          )}

          {/* ── Sorting Buttons (study mode) ── */}
          {studyMode && !studyComplete && (
            <div className="flex flex-col items-center gap-3">
              {!isFlipped && (
                <p className="text-xs text-muted-foreground text-center">Flip the card first, then rate yourself</p>
              )}
              <div className="flex gap-3 flex-wrap justify-center">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => sortCard("unknown")}
                  disabled={!isFlipped}
                  className="h-auto flex-col items-center px-5 py-3 text-destructive border-transparent hover:border-destructive/30 hover:bg-destructive/10 hover:text-destructive min-w-[90px]"
                >
                  <span className="text-lg">✗</span>
                  <span className="text-xs mt-0.5">No clue</span>
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => sortCard("almost")}
                  disabled={!isFlipped}
                  className="h-auto flex-col items-center px-5 py-3 text-amber-500 border-transparent hover:border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-500 min-w-[90px]"
                >
                  <span className="text-lg">~</span>
                  <span className="text-xs mt-0.5">Almost</span>
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => sortCard("known")}
                  disabled={!isFlipped}
                  className="h-auto flex-col items-center px-5 py-3 text-green-500 border-transparent hover:border-green-500/30 hover:bg-green-500/10 hover:text-green-500 min-w-[90px]"
                >
                  <span className="text-lg">✓</span>
                  <span className="text-xs mt-0.5">Know it</span>
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Keyboard shortcuts hint ── */}
      <div className="flex justify-center gap-4 text-[10px] text-muted-foreground mt-auto">
        <span>← → Navigate</span>
        <span>Space / Enter Flip</span>
      </div>
    </div>
  );
}
