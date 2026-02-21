import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { FlashcardViewer } from "../components/Flashcards";
import { ViewHeader } from "../components/Layout";
import { MindMapCanvas } from "../components/MindMap";
import {
  compareLectures,
  getMindmap,
  listLectures,
  mergeFlashcards,
} from "../lib/tauriApi";
import type {
  LectureSummary,
  MindMapData,
  MindMapNode,
  MergedFlashcardsResult,
} from "../lib/types";
import { useToastStore } from "../stores";

const STOPWORDS = new Set([
  "about",
  "after",
  "also",
  "because",
  "between",
  "could",
  "during",
  "every",
  "from",
  "have",
  "into",
  "lecture",
  "might",
  "other",
  "should",
  "their",
  "there",
  "these",
  "those",
  "through",
  "under",
  "using",
  "while",
  "with",
  "would",
]);

type LoadedMindMap = {
  lectureId: string;
  data: MindMapData;
};

type MergeNode = {
  label: string;
  children: Map<string, MergeNode>;
};

function termKey(term: string): string {
  return term.toLowerCase();
}

function extractTerms(text: string): string[] {
  const normalized = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 4 && !STOPWORDS.has(token));
  return Array.from(new Set(normalized));
}

function computeOverlapTerms(summaries: Array<string | undefined>): string[] {
  const counts = new Map<string, number>();

  for (const summary of summaries) {
    const terms = extractTerms(summary ?? "");
    for (const term of terms) {
      counts.set(term, (counts.get(term) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .sort((left, right) => {
      if (right[1] !== left[1]) {
        return right[1] - left[1];
      }
      return right[0].length - left[0].length;
    })
    .slice(0, 24)
    .map(([term]) => term);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightTerms(text: string, terms: string[]): ReactNode {
  if (!text.trim() || terms.length === 0) {
    return text;
  }

  const sorted = [...terms].sort((left, right) => right.length - left.length);
  const pattern = new RegExp(`\\b(${sorted.map(escapeRegExp).join("|")})\\b`, "gi");
  const parts = text.split(pattern);
  const termSet = new Set(sorted.map(termKey));

  return parts.map((part, index) =>
    termSet.has(part.toLowerCase()) ? (
      <mark
        key={`${part}-${index}`}
        className="rounded bg-emerald-500/30 px-1 text-emerald-100"
      >
        {part}
      </mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    ),
  );
}

function mergeNode(parent: MergeNode, source: MindMapNode): void {
  const key = source.label.trim().toLowerCase();
  const existing =
    parent.children.get(key) ??
    {
      label: source.label,
      children: new Map<string, MergeNode>(),
    };

  parent.children.set(key, existing);
  for (const child of source.children ?? []) {
    mergeNode(existing, child);
  }
}

function toMindMapNode(root: MergeNode): MindMapNode {
  let counter = 0;

  const walk = (node: MergeNode): MindMapNode => {
    counter += 1;
    const id = `merged-${counter}`;
    const children = Array.from(node.children.values())
      .sort((left, right) => left.label.localeCompare(right.label))
      .map(walk);

    return {
      id,
      label: node.label,
      children,
    };
  };

  return walk(root);
}

function buildCombinedMindMap(mindmaps: LoadedMindMap[]): MindMapData | null {
  if (mindmaps.length === 0) {
    return null;
  }

  const root: MergeNode = {
    label: "Combined Mind Map",
    children: new Map<string, MergeNode>(),
  };

  for (const item of mindmaps) {
    mergeNode(root, item.data.root);
  }

  return { root: toMindMapNode(root) };
}

export default function Compare() {
  const pushToast = useToastStore((state) => state.pushToast);

  const [lectures, setLectures] = useState<LectureSummary[]>([]);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [comparison, setComparison] = useState<string | null>(null);
  const [mergedDeck, setMergedDeck] = useState<MergedFlashcardsResult | null>(null);
  const [combinedMindMap, setCombinedMindMap] = useState<MindMapData | null>(null);
  const [isLoadingLectures, setIsLoadingLectures] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [isMergingDeck, setIsMergingDeck] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedLectures = useMemo(() => {
    const byId = new Map(lectures.map((lecture) => [lecture.id, lecture]));
    return selectedIds
      .map((id) => byId.get(id))
      .filter((lecture): lecture is LectureSummary => Boolean(lecture));
  }, [lectures, selectedIds]);

  const overlapTerms = useMemo(
    () => computeOverlapTerms(selectedLectures.map((lecture) => lecture.summary)),
    [selectedLectures],
  );

  const filteredLectures = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    if (!lowered) {
      return lectures;
    }

    return lectures.filter((lecture) => {
      const haystack = `${lecture.title} ${lecture.filename}`.toLowerCase();
      return haystack.includes(lowered);
    });
  }, [lectures, query]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingLectures(true);

    void (async () => {
      try {
        const results = await listLectures();
        if (!cancelled) {
          setLectures(results);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : String(loadError));
        }
      } finally {
        if (!cancelled) {
          setIsLoadingLectures(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setComparison(null);
    setMergedDeck(null);
    setCombinedMindMap(null);
    setError(null);
  }, [selectedIds]);

  const toggleLectureSelection = useCallback(
    (lectureId: string) => {
      setSelectedIds((current) => {
        if (current.includes(lectureId)) {
          return current.filter((id) => id !== lectureId);
        }
        if (current.length >= 3) {
          pushToast({ kind: "warning", message: "You can compare up to 3 lectures at once." });
          return current;
        }
        return [...current, lectureId];
      });
    },
    [pushToast],
  );

  const loadMindMapsForSelected = useCallback(async (lectureIds: string[]) => {
    const rawMaps = await Promise.all(
      lectureIds.map(async (lectureId) => {
        const raw = await getMindmap(lectureId);
        if (!raw) {
          return null;
        }

        try {
          const parsed = {
            lectureId,
            data: JSON.parse(raw) as MindMapData,
          };
          return parsed;
        } catch {
          return null;
        }
      }),
    );

    return rawMaps.filter((item): item is LoadedMindMap => Boolean(item));
  }, []);

  const handleCompare = useCallback(async () => {
    if (selectedIds.length < 2) {
      return;
    }

    setError(null);
    setIsComparing(true);
    const snapshot = [...selectedIds];

    try {
      const [analysis, mindMaps] = await Promise.all([
        compareLectures(snapshot),
        loadMindMapsForSelected(snapshot),
      ]);
      setComparison(analysis);
      setCombinedMindMap(buildCombinedMindMap(mindMaps));

      if (mindMaps.length === 0) {
        pushToast({
          kind: "info",
          message: "No mind maps found for the selected lectures yet.",
        });
      } else {
        pushToast({
          kind: "success",
          message: `Comparison complete for ${snapshot.length} lectures.`,
        });
      }
    } catch (compareError) {
      const message = compareError instanceof Error ? compareError.message : String(compareError);
      setError(message);
      pushToast({ kind: "error", message });
    } finally {
      setIsComparing(false);
    }
  }, [loadMindMapsForSelected, pushToast, selectedIds]);

  const handleMergeDeck = useCallback(async () => {
    if (selectedIds.length < 2) {
      return;
    }

    setError(null);
    setIsMergingDeck(true);
    const snapshot = [...selectedIds];
    try {
      const merged = await mergeFlashcards(snapshot);
      setMergedDeck(merged);
      pushToast({
        kind: "success",
        message: `Merged ${merged.cards.length} cards (${merged.duplicate_count} duplicates removed).`,
      });
    } catch (mergeError) {
      const message = mergeError instanceof Error ? mergeError.message : String(mergeError);
      setError(message);
      pushToast({ kind: "error", message });
    } finally {
      setIsMergingDeck(false);
    }
  }, [pushToast, selectedIds]);

  return (
    <div className="mx-auto max-w-[1200px] space-y-6">
      <ViewHeader
        title="Compare Lectures"
        description="Select 2-3 lectures to compare summaries, overlap terms, and combine outputs."
        actions={
          <>
            <button
              type="button"
              onClick={() => void handleCompare()}
              disabled={selectedIds.length < 2 || isComparing}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isComparing ? "Comparing..." : "Run Comparison"}
            </button>
            <button
              type="button"
              onClick={() => void handleMergeDeck()}
              disabled={selectedIds.length < 2 || isMergingDeck}
              className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isMergingDeck ? "Merging..." : "Merge Flashcards"}
            </button>
          </>
        }
      />

      <section className="space-y-4 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search lectures by title or filename..."
            className="w-full max-w-md rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:outline-none"
          />
          <span className="text-xs text-slate-400">
            Selected: {selectedIds.length}/3
          </span>
        </div>

        {isLoadingLectures ? (
          <p className="text-sm text-slate-400">Loading lectures...</p>
        ) : filteredLectures.length === 0 ? (
          <p className="text-sm text-slate-400">No lectures match your search.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {filteredLectures.map((lecture) => {
              const checked = selectedIds.includes(lecture.id);
              const disabled = !checked && selectedIds.length >= 3;

              return (
                <label
                  key={lecture.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 text-sm transition-colors ${
                    checked
                      ? "border-blue-500/60 bg-blue-500/15"
                      : "border-slate-700 bg-slate-800/60 hover:border-slate-600"
                  } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleLectureSelection(lecture.id)}
                    className="mt-0.5 h-4 w-4 accent-blue-500"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-100">{lecture.title}</p>
                    <p className="truncate text-xs text-slate-400">{lecture.filename}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {lecture.summary ? "Summary ready" : "Summary not generated"}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </section>

      {selectedLectures.length >= 2 && (
        <>
          <section className="space-y-3 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="text-lg font-semibold text-slate-100">Overlapping Key Terms</h2>
            {overlapTerms.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {overlapTerms.map((term) => (
                  <span
                    key={term}
                    className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-200"
                  >
                    {term}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                Run comparison after summaries are generated to see overlapping terms.
              </p>
            )}
          </section>

          <section className="space-y-3 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
            <h2 className="text-lg font-semibold text-slate-100">Summary Side-by-Side</h2>
            <div
              className={`grid gap-4 ${
                selectedLectures.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"
              }`}
            >
              {selectedLectures.map((lecture) => (
                <article
                  key={lecture.id}
                  className="rounded-lg border border-slate-700 bg-slate-800/70 p-4"
                >
                  <h3 className="text-sm font-semibold text-slate-100">{lecture.title}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                    {highlightTerms(
                      lecture.summary ?? "No summary available for this lecture yet.",
                      overlapTerms,
                    )}
                  </p>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {comparison && (
        <section className="space-y-3 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Comparison Analysis</h2>
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-300">{comparison}</p>
        </section>
      )}

      {combinedMindMap && (
        <section className="space-y-3 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Combined Mind Map</h2>
          <div className="h-[520px] overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
            <MindMapCanvas data={combinedMindMap} />
          </div>
        </section>
      )}

      {mergedDeck && (
        <section className="space-y-3 rounded-lg border border-slate-700 bg-slate-900/60 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Merged Flashcard Deck</h2>
          <p className="text-sm text-slate-400">
            {mergedDeck.cards.length} cards from {mergedDeck.source_count} lectures (
            {mergedDeck.duplicate_count} near-duplicates removed).
          </p>
          {mergedDeck.cards.length > 0 ? (
            <FlashcardViewer cards={mergedDeck.cards} />
          ) : (
            <p className="text-sm text-slate-400">
              No cards available after merge. Generate flashcards first.
            </p>
          )}
        </section>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}
    </div>
  );
}
