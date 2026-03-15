import { useCallback, useEffect, useState } from "react";
import { PaperSkeleton } from "../components/Skeletons";
import { PaperList } from "../components/Research";
import { ViewHeader } from "../components/Layout";
import { getLecturePapers, searchRelatedPapers } from "../lib/tauriApi";
import type { Paper } from "../lib/types";
import { useLectureStore, useSettingsStore, useToastStore } from "../stores";
import { Button } from "@/components/ui/button";

export default function Research() {
  const { currentLectureId, lectures } = useLectureStore();
  const { settings } = useSettingsStore();
  const pushToast = useToastStore((state) => state.pushToast);

  const currentLecture = lectures.find((l) => l.id === currentLectureId) ?? null;

  const [papers, setPapers] = useState<Paper[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

  // Load saved papers on mount / lecture change
  useEffect(() => {
    if (!currentLectureId) return;

    let cancelled = false;
    setHasLoaded(false);
    setPapers([]);
    setError(null);

    getLecturePapers(currentLectureId)
      .then((saved) => {
        if (cancelled) return;
        if (saved && saved.length > 0) {
          setPapers(saved);
        }
        setHasLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setHasLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [currentLectureId]);

  const handleSearch = useCallback(async () => {
    if (!currentLectureId) return;
    setIsLoading(true);
    setError(null);
    try {
      const results = await searchRelatedPapers(currentLectureId);
      setPapers(results);
      pushToast({
        kind: "success",
        message: `Found ${results.length} related paper${results.length === 1 ? "" : "s"}.`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const lower = message.toLowerCase();
      const isNetworkFailure =
        lower.includes("request failed") ||
        lower.includes("timed out") ||
        lower.includes("connection") ||
        lower.includes("network");
      setError(
        isNetworkFailure
          ? "Research paper search requires internet access. Check your connection and retry."
          : message,
      );
      pushToast({
        kind: "error",
        message: "Paper search failed. Verify internet access and try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentLectureId, pushToast]);

  // ── No lecture selected ────────────────────────────────────────────────────
  if (!currentLectureId || !currentLecture) {
    return (
      <div className="mx-auto max-w-[900px] space-y-6">
        <ViewHeader
          title="Related Research"
          description="Find relevant papers from Semantic Scholar."
        />
        <div className="flex h-64 flex-col items-center justify-center space-y-2 text-muted-foreground">
          <span className="text-4xl">🔬</span>
          <p className="text-sm">No knowte selected.</p>
          <p className="text-xs">Add and process a knowte to find related papers.</p>
        </div>
      </div>
    );
  }

  // ── Research disabled in settings ──────────────────────────────────────────
  if (settings && !settings.enable_research) {
    return (
      <div className="mx-auto max-w-[900px] space-y-6">
        <ViewHeader
          title="Related Research"
          description="Find relevant papers from Semantic Scholar."
        />
        <div className="flex h-48 flex-col items-center justify-center space-y-3 rounded-lg border border-border bg-card text-muted-foreground shadow-sm">
          <span className="text-3xl">📡</span>
          <p className="text-sm font-medium text-foreground">Research paper search is disabled.</p>
          <p className="text-xs">
            Enable "Research paper search" in{" "}
            <span className="text-primary">Settings → Research</span> to find related papers.
          </p>
        </div>
      </div>
    );
  }

  // ── Main view ──────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <ViewHeader
        title="Related Research"
        description={`Papers related to ${currentLecture.filename} via Semantic Scholar`}
        actions={
          <Button
            onClick={() => void handleSearch()}
            disabled={isLoading}
          >
            {isLoading ? "Searching..." : "Search Papers"}
          </Button>
        }
      />

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          <span className="mt-0.5">⚠</span>
          <div>
            <p className="font-medium">Search failed</p>
            <p className="text-xs mt-0.5 text-destructive">{error}</p>
            <Button
              variant="outline"
              onClick={() => void handleSearch()}
              className="mt-3 h-8 px-3 py-1.5 text-xs"
            >
              Retry Search
            </Button>
          </div>
        </div>
      )}

      {/* Empty state — no papers yet */}
      {hasLoaded && papers.length === 0 && !isLoading && !error && (
        <div className="flex flex-col items-center justify-center h-56 bg-card rounded-lg border border-border border-dashed space-y-4 shadow-sm">
          <span className="text-4xl">📚</span>
          <div className="text-center space-y-1">
            <p className="text-sm font-medium text-foreground">No papers found yet.</p>
            <p className="text-xs text-muted-foreground">
              Make sure the pipeline has finished, then click the button below.
            </p>
          </div>
          <Button
            onClick={handleSearch}
            disabled={isLoading}
          >
            Search for Papers
          </Button>
        </div>
      )}

      {/* Paper list */}
      {papers.length > 0 && (
        <PaperList papers={papers} isLoading={isLoading} onRefresh={handleSearch} />
      )}

      {isLoading && papers.length === 0 && <PaperSkeleton />}

      {/* Internet disclaimer */}
      <p className="text-xs text-muted-foreground pt-2">
        ✦ Paper data is fetched from the{" "}
        <a
          href="https://www.semanticscholar.org"
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-foreground underline"
        >
          Semantic Scholar
        </a>{" "}
        API — the only external network call made by this app.
      </p>
    </div>
  );
}
