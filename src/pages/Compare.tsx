import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { FlashcardViewer } from "../components/Flashcards";
import { ViewHeader } from "../components/Layout";
import { MindMapCanvas } from "../components/MindMap";
import { hasMindMapContent, parseMindMapJson } from "../lib/mindmap";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Play, Layers } from "lucide-react";

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
        className="rounded bg-primary/10 px-1 text-primary"
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
          const data = parseMindMapJson(raw);
          if (!hasMindMapContent(data)) {
            return null;
          }

          const parsed = {
            lectureId,
            data,
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
            <Button
              onClick={() => void handleCompare()}
              disabled={selectedIds.length < 2 || isComparing}
            >
              {isComparing ? (
                "Comparing..."
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Run Comparison
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => void handleMergeDeck()}
              disabled={selectedIds.length < 2 || isMergingDeck}
            >
              {isMergingDeck ? (
                "Merging..."
              ) : (
                <>
                  <Layers className="mr-2 h-4 w-4" />
                  Merge Flashcards
                </>
              )}
            </Button>
          </>
        }
      />

      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search lectures..."
                className="pl-9"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              Selected: {selectedIds.length}/3
            </span>
          </div>

          {isLoadingLectures ? (
            <p className="text-sm text-muted-foreground">Loading lectures...</p>
          ) : filteredLectures.length === 0 ? (
            <p className="text-sm text-muted-foreground">No knowtes match your search.</p>
          ) : (
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {filteredLectures.map((lecture) => {
                const checked = selectedIds.includes(lecture.id);
                const disabled = !checked && selectedIds.length >= 3;

                return (
                  <Card
                    key={lecture.id}
                    className={`cursor-pointer transition-colors ${
                      checked
                        ? "border-primary bg-accent/50"
                        : "hover:bg-accent/30"
                    } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                    onClick={() => !disabled && toggleLectureSelection(lecture.id)}
                  >
                    <CardContent className="flex items-start gap-3 p-3 text-sm">
                      <Checkbox
                        checked={checked}
                        disabled={disabled}
                        onCheckedChange={() => toggleLectureSelection(lecture.id)}
                        className="mt-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{lecture.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {lecture.filename}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {lecture.summary ? "Summary ready" : "Summary not generated"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedLectures.length >= 2 && (
        <>
          <Card className="shadow-sm">
            <CardContent className="p-4 space-y-3">
              <h2 className="text-lg font-semibold">Overlapping Key Terms</h2>
              {overlapTerms.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {overlapTerms.map((term) => (
                    <span
                      key={term}
                      className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Run comparison after summaries are generated to see overlapping terms.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-4 space-y-3">
              <h2 className="text-lg font-semibold">Summary Side-by-Side</h2>
              <div
                className={`grid gap-4 ${
                  selectedLectures.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 xl:grid-cols-3"
                }`}
              >
                {selectedLectures.map((lecture) => (
                  <Card key={lecture.id} className="shadow-none bg-muted/30">
                    <CardContent className="p-4">
                      <h3 className="text-sm font-semibold">{lecture.title}</h3>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {highlightTerms(
                          lecture.summary ?? "No summary available for this lecture yet.",
                          overlapTerms,
                        )}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {comparison && (
        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-lg font-semibold">Comparison Analysis</h2>
            <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{comparison}</p>
          </CardContent>
        </Card>
      )}

      {combinedMindMap && (
        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-lg font-semibold">Combined Mind Map</h2>
            <div className="h-[520px] overflow-hidden rounded-lg border bg-muted/10">
              <MindMapCanvas data={combinedMindMap} />
            </div>
          </CardContent>
        </Card>
      )}

      {mergedDeck && (
        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-3">
            <h2 className="text-lg font-semibold">Merged Flashcard Deck</h2>
            <p className="text-sm text-muted-foreground">
              {mergedDeck.cards.length} cards from {mergedDeck.source_count} lectures (
              {mergedDeck.duplicate_count} near-duplicates removed).
            </p>
            {mergedDeck.cards.length > 0 ? (
              <FlashcardViewer cards={mergedDeck.cards} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No cards available after merge. Generate flashcards first.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
    </div>
  );
}
