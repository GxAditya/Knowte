import { useMemo, useState } from "react";
import { useLectureStore } from "../../stores";

interface TranscriptViewerProps {
  activeSegmentIndex?: number | null;
  onSegmentClick?: (index: number) => void;
  showHeader?: boolean;
}

const formatTimestamp = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60)
    .toString()
    .padStart(2, "0");
  const remainder = (safeSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
};

export default function TranscriptViewer({
  activeSegmentIndex = null,
  onSegmentClick,
  showHeader = true,
}: TranscriptViewerProps) {
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);
  const { lectures, currentLectureId } = useLectureStore();

  const lecture = useMemo(
    () => lectures.find((item) => item.id === currentLectureId) ?? null,
    [lectures, currentLectureId],
  );

  const segments = lecture?.transcriptSegments ?? [];
  const fullTranscript = lecture?.transcript ?? "";

  const filteredSegments = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const indexedSegments = segments.map((segment, index) => ({ segment, index }));
    if (!normalizedQuery) {
      return indexedSegments;
    }

    return indexedSegments.filter(({ segment }) =>
      segment.text.toLowerCase().includes(normalizedQuery),
    );
  }, [segments, query]);

  const handleCopyAll = async () => {
    if (!fullTranscript) {
      return;
    }

    try {
      await navigator.clipboard.writeText(fullTranscript);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  if (!lecture) {
    return (
      <div className="mx-auto max-w-[900px] glass-panel p-6 text-center animate-view-in space-y-2">
        <h1 className="text-xl font-bold text-[var(--text-primary)] font-heading">Transcript</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Process a knowte from the Upload page to generate a transcript.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      {showHeader && (
        <header className="space-y-1">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Transcript</h1>
          <p className="text-sm text-[var(--text-muted)]">{lecture.filename}</p>
        </header>
      )}

      <section className="glass-panel p-5 animate-slide-up">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 relative">
            <label htmlFor="transcript-search" className="sr-only">
              Search transcript
            </label>
            <input
              id="transcript-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search transcript..."
              className="input w-full pl-10"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--text-muted)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="button"
            onClick={() => void handleCopyAll()}
            disabled={!fullTranscript}
            className="btn-secondary whitespace-nowrap"
          >
            {copied ? "Copied" : "Copy All"}
          </button>
        </div>
      </section>

      <section className="glass-panel p-5 animate-slide-up" style={{ animationDelay: "100ms" }}>
        {filteredSegments.length > 0 ? (
          <div className="space-y-4">
            {filteredSegments.map(({ segment, index }) => (
              <article
                key={`${segment.start}-${segment.end}-${index}`}
                className={`block w-full rounded-2xl border px-5 py-4 text-left transition-all duration-300 ${
                  activeSegmentIndex === index
                    ? "border-[var(--accent-primary)] bg-[var(--accent-primary-subtle)] shadow-[var(--card-shadow-glow)]"
                    : "border-[var(--border-subtle)] bg-[var(--bg-surface-overlay)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-surface-raised)]"
                }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <button
                    type="button"
                    onClick={() => onSegmentClick?.(index)}
                    className="badge badge-info hover:opacity-80 transition-opacity"
                    title="Seek audio playback to this segment"
                  >
                    {formatTimestamp(segment.start)} - {formatTimestamp(segment.end)}
                  </button>
                </div>
                <p className="select-text text-[0.95rem] leading-relaxed text-[var(--text-secondary)]" data-selection-context>
                  {segment.text}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-[var(--text-muted)]">
              {query
                ? "No transcript segments match your search."
                : "No transcript segments are available for this knowte yet."}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
