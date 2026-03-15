import { useMemo, useState } from "react";
import { useLectureStore } from "../../stores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
      <Card className="mx-auto max-w-[900px] text-center animate-view-in space-y-2">
        <CardContent className="p-6">
          <h1 className="text-xl font-bold font-heading">Transcript</h1>
          <p className="text-sm text-muted-foreground">
            Process a knowte from the Upload page to generate a transcript.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      {showHeader && (
        <header className="space-y-1">
          <h1 className="text-2xl font-bold">Transcript</h1>
          <p className="text-sm text-muted-foreground">{lecture.filename}</p>
        </header>
      )}

      <Card className="animate-slide-up">
        <CardContent className="p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 relative">
              <label htmlFor="transcript-search" className="sr-only">
                Search transcript
              </label>
              <Input
                id="transcript-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search transcript..."
                className="w-full pl-10"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <Button
              variant="secondary"
              type="button"
              onClick={() => void handleCopyAll()}
              disabled={!fullTranscript}
              className="whitespace-nowrap"
            >
              {copied ? "Copied" : "Copy All"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="animate-slide-up" style={{ animationDelay: "100ms" }}>
        <CardContent className="p-5">
        {filteredSegments.length > 0 ? (
          <div className="space-y-4">
            {filteredSegments.map(({ segment, index }) => (
              <article
                key={`${segment.start}-${segment.end}-${index}`}
                className={`block w-full rounded-2xl border px-5 py-4 text-left transition-all duration-300 ${activeSegmentIndex === index
                    ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                    : "border-border bg-card hover:border-border/80 hover:bg-accent hover:text-accent-foreground"
                  }`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <button
                    type="button"
                    onClick={() => onSegmentClick?.(index)}
                    title="Seek audio playback to this segment"
                    className="hover:opacity-80 transition-opacity"
                  >
                    <Badge variant={activeSegmentIndex === index ? "default" : "secondary"}>
                      {formatTimestamp(segment.start)} - {formatTimestamp(segment.end)}
                    </Badge>
                  </button>
                </div>
                <p className={`select-text text-[0.95rem] leading-relaxed ${activeSegmentIndex === index ? "text-foreground" : "text-muted-foreground"}`} data-selection-context>
                  {segment.text}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              {query
                ? "No transcript segments match your search."
                : "No transcript segments are available for this knowte yet."}
            </p>
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
