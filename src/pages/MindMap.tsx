import { useCallback, useEffect, useState } from "react";
import { MindMapSkeleton } from "../components/Skeletons";
import { MindMapCanvas } from "../components/MindMap";
import { ViewHeader } from "../components/Layout";
import { hasMindMapContent, parseMindMapJson } from "../lib/mindmap";
import { getMindmap, regenerateMindmap } from "../lib/tauriApi";
import type { MindMapData } from "../lib/types";
import { useLectureStore, usePipelineStore, useToastStore } from "../stores";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

// ─── Empty / error states ─────────────────────────────────────────────────────

interface EmptyStateProps {
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
}

function EmptyState({ isGenerating, error, onGenerate }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-muted-foreground select-none">
      <svg
        aria-hidden="true"
        className="w-20 h-20 text-muted-foreground"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1}
      >
        <circle cx="12" cy="12" r="3" />
        <circle cx="4" cy="5" r="2" />
        <circle cx="20" cy="5" r="2" />
        <circle cx="4" cy="19" r="2" />
        <circle cx="20" cy="19" r="2" />
        <line x1="12" y1="9" x2="5.5" y2="6.5" />
        <line x1="12" y1="9" x2="18.5" y2="6.5" />
        <line x1="12" y1="15" x2="5.5" y2="17.5" />
        <line x1="12" y1="15" x2="18.5" y2="17.5" />
      </svg>
      <div className="text-center space-y-2">
        <p className="text-foreground font-medium text-lg">No mind map yet</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Generate a visual overview of the lecture's key concepts and their relationships.
        </p>
      </div>
      {error && (
        <p className="text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2 max-w-sm text-center">
          {error}
        </p>
      )}
      <Button
        onClick={onGenerate}
        disabled={isGenerating}
        className="flex items-center gap-2"
      >
        {isGenerating ? (
          <>
            <Spinner className="size-4" />
            Generating mind map…
          </>
        ) : (
          "Generate Mind Map"
        )}
      </Button>
    </div>
  );
}

// ─── No-lecture placeholder ───────────────────────────────────────────────────

function NoLecture() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground select-none">
      <svg
        aria-hidden="true"
        className="w-14 h-14 text-muted-foreground"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
      <p className="text-muted-foreground text-sm">Add a knowte to see its mind map</p>
    </div>
  );
}

// ─── MindMap page ─────────────────────────────────────────────────────────────

export default function MindMap() {
  const { currentLectureId } = useLectureStore();
  const pushToast = useToastStore((state) => state.pushToast);
  const mindmapStageError = usePipelineStore((state) =>
    currentLectureId
      ? state.lectureStates[currentLectureId]?.stages.find((stage) => stage.name === "mindmap")
          ?.error ?? null
      : null,
  );

  const [mindmapData, setMindmapData] = useState<MindMapData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parseStoredMindMap = useCallback((json: string) => {
    const parsed = parseMindMapJson(json);
    return hasMindMapContent(parsed) ? parsed : null;
  }, []);

  // Load mindmap from backend when lecture changes
  useEffect(() => {
    if (!currentLectureId) {
      setMindmapData(null);
      setError(null);
      setIsLoading(false);
      return;
    }
    setMindmapData(null);
    setIsLoading(true);
    setError(null);
    getMindmap(currentLectureId)
      .then((json) => {
        if (json) {
          try {
            const parsed = parseStoredMindMap(json);
            if (parsed) {
              setMindmapData(parsed);
            } else {
              setMindmapData(null);
              setError("Stored mind map data is invalid or incomplete.");
            }
          } catch {
            setMindmapData(null);
            setError("Could not parse mind map data.");
          }
        } else {
          setMindmapData(null);
        }
      })
      .catch((err: unknown) => {
        setMindmapData(null);
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => setIsLoading(false));
  }, [currentLectureId, parseStoredMindMap]);

  const handleGenerate = useCallback(async () => {
    if (!currentLectureId) return;
    setIsGenerating(true);
    setError(null);
    try {
      const json = await regenerateMindmap(currentLectureId);
      if (json) {
        const parsed = parseStoredMindMap(json);
        if (parsed) {
          setMindmapData(parsed);
          pushToast({ kind: "success", message: "Mind map regenerated successfully." });
        } else {
          setError("Regenerated mind map data is invalid or incomplete.");
          pushToast({ kind: "error", message: "Mind map regeneration returned invalid data." });
        }
      } else {
        pushToast({ kind: "warning", message: "Mind map regeneration returned no data." });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      pushToast({ kind: "error", message: "Failed to regenerate mind map." });
    } finally {
      setIsGenerating(false);
    }
  }, [currentLectureId, parseStoredMindMap, pushToast]);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (!currentLectureId) {
    return (
      <div className="flex h-full flex-col">
        <div className="px-6 pt-6">
          <ViewHeader
            title="Mind Map"
            description="Visual overview of lecture concepts"
          />
        </div>
        <div className="flex-1 min-h-0">
          <NoLecture />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-6 pt-6">
        <ViewHeader
          title="Mind Map"
          description={
            mindmapData
              ? "Zoom, pan, and click nodes to explore branches"
              : "Visual overview of lecture concepts"
          }
          actions={
            mindmapData ? (
              <Button
                variant="outline"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Spinner className="size-3.5" />
                    Regenerating…
                  </>
                ) : (
                  "Regenerate"
                )}
              </Button>
            ) : null
          }
        />
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0">
        {isLoading ? (
          <MindMapSkeleton />
        ) : mindmapData ? (
          <MindMapCanvas data={mindmapData} />
        ) : (
          <EmptyState
            isGenerating={isGenerating}
            error={error ?? mindmapStageError}
            onGenerate={handleGenerate}
          />
        )}
      </div>
    </div>
  );
}
