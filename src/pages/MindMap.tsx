import { useCallback, useEffect, useState } from "react";
import { MindMapSkeleton } from "../components/Skeletons";
import { MindMapCanvas } from "../components/MindMap";
import { ViewHeader } from "../components/Layout";
import { getMindmap, regenerateMindmap } from "../lib/tauriApi";
import type { MindMapData } from "../lib/types";
import { useLectureStore, useToastStore } from "../stores";

// ─── Empty / error states ─────────────────────────────────────────────────────

interface EmptyStateProps {
  isGenerating: boolean;
  error: string | null;
  onGenerate: () => void;
}

function EmptyState({ isGenerating, error, onGenerate }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-slate-400 select-none">
      <svg
        aria-hidden="true"
        className="w-20 h-20 text-slate-700"
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
        <p className="text-slate-300 font-medium text-lg">No mind map yet</p>
        <p className="text-sm text-slate-500 max-w-xs">
          Generate a visual overview of the lecture's key concepts and their relationships.
        </p>
      </div>
      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-4 py-2 max-w-sm text-center">
          {error}
        </p>
      )}
      <button
        onClick={onGenerate}
        disabled={isGenerating}
        className="flex items-center gap-2 rounded-md bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isGenerating ? (
          <>
            <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            Generating mind map…
          </>
        ) : (
          "Generate Mind Map"
        )}
      </button>
    </div>
  );
}

// ─── No-lecture placeholder ───────────────────────────────────────────────────

function NoLecture() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 select-none">
      <svg
        aria-hidden="true"
        className="w-14 h-14 text-slate-700"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0H3" />
      </svg>
      <p className="text-slate-500 text-sm">Upload a lecture to see its mind map</p>
    </div>
  );
}

// ─── MindMap page ─────────────────────────────────────────────────────────────

export default function MindMap() {
  const { currentLectureId } = useLectureStore();
  const pushToast = useToastStore((state) => state.pushToast);

  const [mindmapData, setMindmapData] = useState<MindMapData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load mindmap from backend when lecture changes
  useEffect(() => {
    if (!currentLectureId) {
      setMindmapData(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    getMindmap(currentLectureId)
      .then((json) => {
        if (json) {
          try {
            setMindmapData(JSON.parse(json) as MindMapData);
          } catch {
            setError("Could not parse mind map data.");
          }
        } else {
          setMindmapData(null);
        }
      })
      .catch((err: unknown) => {
        setError(String(err));
      })
      .finally(() => setIsLoading(false));
  }, [currentLectureId]);

  const handleGenerate = useCallback(async () => {
    if (!currentLectureId) return;
    setIsGenerating(true);
    setError(null);
    try {
      const json = await regenerateMindmap(currentLectureId);
      if (json) {
        setMindmapData(JSON.parse(json) as MindMapData);
        pushToast({ kind: "success", message: "Mind map regenerated successfully." });
      } else {
        pushToast({ kind: "warning", message: "Mind map regeneration returned no data." });
      }
    } catch (err: unknown) {
      setError(String(err));
      pushToast({ kind: "error", message: "Failed to regenerate mind map." });
    } finally {
      setIsGenerating(false);
    }
  }, [currentLectureId, pushToast]);

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
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="flex items-center gap-2 rounded-md border border-slate-600 bg-slate-700 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
                    Regenerating…
                  </>
                ) : (
                  "Regenerate"
                )}
              </button>
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
          <EmptyState isGenerating={isGenerating} error={error} onGenerate={handleGenerate} />
        )}
      </div>
    </div>
  );
}
