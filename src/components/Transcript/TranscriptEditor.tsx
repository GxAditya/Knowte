import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { updateTranscriptSegment } from "../../lib/tauriApi";
import type { TranscriptSegment } from "../../lib/types";
import { useLectureStore } from "../../stores";

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
      <div className="rounded-lg border border-slate-700 bg-slate-800/70 p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-100">Transcript Editor</h1>
        <p className="mt-2 text-sm text-slate-400">
          Process a lecture from the Upload page to edit transcript segments.
        </p>
      </div>
    );
  }

  if (!lecture.transcriptId) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 shadow-sm">
        <h1 className="text-xl font-semibold text-amber-100">Transcript Editor</h1>
        <p className="mt-2 text-sm text-amber-200">
          Transcript editing is unavailable for this lecture. Re-process the lecture
          transcript to enable editing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-700 bg-slate-800/70 p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1">
            <label htmlFor="transcript-editor-search" className="sr-only">
              Search transcript
            </label>
            <input
              id="transcript-editor-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search transcript segments..."
              className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-slate-400">
            Editing auto-saves 1 second after each change.
          </p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-700 bg-slate-800/70 p-4 shadow-sm">
        {filteredSegments.length === 0 ? (
          <p className="text-sm text-slate-400">
            {query
              ? "No transcript segments match your search."
              : "No transcript segments are available for this lecture."}
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
                  className={`rounded-md border bg-slate-900/60 p-3 transition-colors ${
                    activeSegmentIndex === index
                      ? "border-blue-500 ring-1 ring-blue-500/70"
                      : "border-slate-700"
                  }`}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => onSegmentClick?.(index)}
                      className="rounded-md bg-slate-800 px-2 py-1 text-xs text-blue-300 transition-colors hover:bg-slate-700"
                    >
                      {formatTimestamp(segment.start)} - {formatTimestamp(segment.end)}
                    </button>

                    <div className="flex items-center gap-2 text-xs">
                      {isSaving && <span className="text-blue-300">Saving...</span>}
                      {errorMessage && <span className="text-red-300">{errorMessage}</span>}
                      <button
                        type="button"
                        disabled={!hasOriginal}
                        onClick={() => handleResetSegment(index)}
                        className="rounded-md border border-slate-600 px-2 py-1 text-slate-200 transition-colors hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Reset to original
                      </button>
                    </div>
                  </div>

                  <textarea
                    value={segment.text}
                    onChange={(event) => handleSegmentInput(index, event.target.value)}
                    rows={Math.max(2, Math.ceil(segment.text.length / 80))}
                    className="w-full resize-none rounded-md border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
