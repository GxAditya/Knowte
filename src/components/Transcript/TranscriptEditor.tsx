import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { updateTranscriptSegment } from "../../lib/tauriApi";
import type { TranscriptSegment } from "../../lib/types";
import { useLectureStore } from "../../stores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface TranscriptEditorProps {
  activeSegmentIndex?: number | null;
  onSegmentClick?: (index: number) => void;
}

const SAVE_DEBOUNCE_MS = 1000;

const formatTimestamp = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
};

export default function TranscriptEditor({
  activeSegmentIndex = null,
  onSegmentClick,
}: TranscriptEditorProps) {
  const [query, setQuery] = useState("");
  const [draftSegments, setDraftSegments] = useState<TranscriptSegment[]>([]);
  const [savingIndices, setSavingIndices] = useState<Set<number>>(new Set());
  const [segmentErrors, setSegmentErrors] = useState<Record<number, string>>({});
  const debounceTimersRef = useRef<Map<number, number>>(new Map());
  const saveGenerationRef = useRef<Map<number, number>>(new Map());

  const { lectures, currentLectureId, updateLecture } = useLectureStore();

  const lecture = useMemo(
    () => lectures.find((item) => item.id === currentLectureId) ?? null,
    [lectures, currentLectureId],
  );

  useEffect(() => {
    setDraftSegments((lecture?.transcriptSegments ?? []).map((segment) => ({ ...segment })));
    setSavingIndices(new Set());
    setSegmentErrors({});

    for (const timer of debounceTimersRef.current.values()) {
      window.clearTimeout(timer);
    }
    debounceTimersRef.current.clear();
  }, [lecture?.id, lecture?.transcriptSegments]);

  useEffect(
    () => () => {
      for (const timer of debounceTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      debounceTimersRef.current.clear();
    },
    [],
  );

  const persistSegment = useCallback(
    async (segmentIndex: number, text: string, generation: number) => {
      if (!lecture?.transcriptId) {
        return;
      }

      setSavingIndices((previous) => {
        const next = new Set(previous);
        next.add(segmentIndex);
        return next;
      });
      setSegmentErrors((previous) => {
        if (previous[segmentIndex] === undefined) {
          return previous;
        }

        const next = { ...previous };
        delete next[segmentIndex];
        return next;
      });

      try {
        const updated = await updateTranscriptSegment(
          lecture.transcriptId,
          segmentIndex,
          text,
        );

        if ((saveGenerationRef.current.get(segmentIndex) ?? 0) !== generation) {
          return;
        }

        setDraftSegments(updated.segments.map((segment) => ({ ...segment })));
        updateLecture(lecture.id, {
          transcript: updated.full_text,
          transcriptSegments: updated.segments,
        });
      } catch (saveError) {
        const message =
          saveError instanceof Error ? saveError.message : String(saveError);
        setSegmentErrors((previous) => ({
          ...previous,
          [segmentIndex]: message,
        }));
      } finally {
        setSavingIndices((previous) => {
          const next = new Set(previous);
          next.delete(segmentIndex);
          return next;
        });
      }
    },
    [lecture, updateLecture],
  );

  const scheduleSave = useCallback(
    (segmentIndex: number, text: string) => {
      const previousTimer = debounceTimersRef.current.get(segmentIndex);
      if (previousTimer !== undefined) {
        window.clearTimeout(previousTimer);
      }

      const generation = (saveGenerationRef.current.get(segmentIndex) ?? 0) + 1;
      saveGenerationRef.current.set(segmentIndex, generation);
      const timer = window.setTimeout(() => {
        debounceTimersRef.current.delete(segmentIndex);
        void persistSegment(segmentIndex, text, generation);
      }, SAVE_DEBOUNCE_MS);
      debounceTimersRef.current.set(segmentIndex, timer);
    },
    [persistSegment],
  );

  const filteredSegments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const indexedSegments = draftSegments.map((segment, index) => ({ segment, index }));
    if (!normalizedQuery) {
      return indexedSegments;
    }

    return indexedSegments.filter(({ segment }) =>
      segment.text.toLowerCase().includes(normalizedQuery),
    );
  }, [draftSegments, query]);

  const handleSegmentInput = (segmentIndex: number, value: string) => {
    setDraftSegments((previous) =>
      previous.map((segment, index) =>
        index === segmentIndex ? { ...segment, text: value } : segment,
      ),
    );
    scheduleSave(segmentIndex, value);
  };

  const handleResetSegment = (segmentIndex: number) => {
    if (!lecture?.originalTranscriptSegments?.[segmentIndex] || !lecture.transcriptId) {
      return;
    }

    const originalText = lecture.originalTranscriptSegments[segmentIndex].text;
    const previousTimer = debounceTimersRef.current.get(segmentIndex);
    if (previousTimer !== undefined) {
      window.clearTimeout(previousTimer);
      debounceTimersRef.current.delete(segmentIndex);
    }

    setDraftSegments((previous) =>
      previous.map((segment, index) =>
        index === segmentIndex ? { ...segment, text: originalText } : segment,
      ),
    );

    const generation = (saveGenerationRef.current.get(segmentIndex) ?? 0) + 1;
    saveGenerationRef.current.set(segmentIndex, generation);
    void persistSegment(segmentIndex, originalText, generation);
  };

  if (!lecture) {
    return (
      <Card>
        <CardContent className="p-4">
          <h1 className="text-xl font-semibold">Transcript Editor</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Process a knowte from the Upload page to edit transcript segments.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!lecture.transcriptId) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="p-4">
          <h1 className="text-xl font-semibold text-destructive">Transcript Editor</h1>
          <p className="mt-2 text-sm text-destructive">
            Transcript editing is unavailable for this knowte. Re-process the knowte
            transcript to enable editing.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <label htmlFor="transcript-editor-search" className="sr-only">
              Search transcript
            </label>
            <Input
              id="transcript-editor-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search transcript segments..."
              className="w-full"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Editing auto-saves 1 second after each change.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
        {filteredSegments.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {query
              ? "No transcript segments match your search."
              : "No transcript segments are available for this knowte."}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredSegments.map(({ segment, index }) => {
              const isSaving = savingIndices.has(index);
              const errorMessage = segmentErrors[index];
              const hasOriginal = lecture.originalTranscriptSegments?.[index] !== undefined;

              return (
                <article
                  key={`${segment.start}-${segment.end}-${index}`}
                  className={`rounded-md border bg-card p-3 transition-colors ${activeSegmentIndex === index
                      ? "border-primary ring-1 ring-primary"
                      : "border-border"
                    }`}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSegmentClick?.(index)}
                      className="rounded-md bg-accent px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent/80"
                    >
                      {formatTimestamp(segment.start)} - {formatTimestamp(segment.end)}
                    </button>

                    <div className="flex items-center gap-2 text-xs">
                      {isSaving && <span className="text-muted-foreground">Saving...</span>}
                      {errorMessage && <span className="text-destructive">{errorMessage}</span>}
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!hasOriginal}
                        onClick={() => handleResetSegment(index)}
                        className="h-7 px-2 text-xs"
                      >
                        Reset to original
                      </Button>
                    </div>
                  </div>

                  <textarea
                    value={segment.text}
                    onChange={(event) => handleSegmentInput(index, event.target.value)}
                    rows={Math.max(2, Math.ceil(segment.text.length / 80))}
                    className="flex w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </article>
              );
            })}
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
