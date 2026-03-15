import { useEffect, useRef, useState } from "react";
import {
  getPipelineStatus,
  regenerateMindmap,
  regenerateNotes,
  regenerateQuiz,
  startPipeline,
  startPipelineWithOptions,
} from "../../lib/tauriApi";
import type { PipelineStage } from "../../lib/types";
import { useToastStore } from "../../stores";
import { usePipelineStore, PIPELINE_STAGE_DEFS, TOTAL_PIPELINE_STAGES } from "../../stores/pipelineStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";

// ─── Sub-components ───────────────────────────────────────────────────────────

function StageRow({
  stage,
  streamingPreview,
  sectionProgressText,
  isMutating,
  onRetry,
  onSkip,
}: {
  stage: PipelineStage;
  streamingPreview: string;
  sectionProgressText?: string;
  isMutating: boolean;
  onRetry: () => void;
  onSkip: () => void;
}) {
  const statusColors: Record<string, string> = {
    pending: "border-border bg-card shadow-sm opacity-60",
    running: "border-primary bg-card shadow-sm ring-1 ring-primary/20",
    complete: "border-border bg-card shadow-sm",
    error: "border-destructive/50 bg-card shadow-sm",
  };

  const iconColors: Record<string, string> = {
    pending: "text-muted-foreground",
    running: "text-primary",
    complete: "text-green-500",
    error: "text-destructive",
  };

  return (
    <Card className={`transition-all duration-300 ${statusColors[stage.status]}`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
        <div className={`flex-shrink-0 ${iconColors[stage.status]}`}>
          {stage.status === "pending" && (
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="8" strokeWidth="2" />
            </svg>
          )}
          {stage.status === "running" && <Spinner className="size-4" />}
          {stage.status === "complete" && (
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {stage.status === "error" && (
            <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        <span
          className={`flex-1 text-sm font-medium ${stage.status === "pending"
              ? "text-muted-foreground"
              : stage.status === "complete"
                ? "text-green-500"
                : stage.status === "error"
                  ? "text-destructive"
                  : "text-foreground"
            }`}
        >
          {stage.label}
        </span>

        <span className="text-xs capitalize text-muted-foreground">
          {stage.status === "running" ? "In progress…" : stage.status}
        </span>
      </div>

      {sectionProgressText && (
        <p className="mt-1 text-[11px] text-muted-foreground">{sectionProgressText}</p>
      )}

      {/* Streaming preview while running */}
      {stage.status === "running" && streamingPreview && (
        <div className="mt-3 rounded-md bg-muted p-3">
          <p className="line-clamp-3 font-mono text-xs text-muted-foreground leading-relaxed">{streamingPreview}</p>
        </div>
      )}

      {/* Result preview once complete */}
      {stage.status === "complete" && stage.preview && (
        <div className="mt-3 rounded-md bg-muted p-3">
          <p className="line-clamp-2 text-xs text-muted-foreground leading-relaxed">{stage.preview}</p>
        </div>
      )}

      {/* Error message */}
      {stage.status === "error" && stage.error && (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-destructive">{stage.error}</p>
          <div className="flex gap-2">
            <Button
              variant="destructive"
              size="sm"
              type="button"
              onClick={onRetry}
              disabled={isMutating}
              className="h-7 px-2.5 py-1 text-xs"
            >
              {isMutating ? "Retrying..." : "Retry"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              type="button"
              onClick={onSkip}
              disabled={isMutating}
              className="h-7 px-2.5 py-1 text-xs"
            >
              Skip
            </Button>
          </div>
        </div>
      )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ProgressTrackerProps {
  lectureId: string | null;
  /** Called once when all stages have completed or errored. */
  onPipelineComplete?: () => void;
  className?: string;
}

export default function ProgressTracker({
  lectureId,
  onPipelineComplete,
  className,
}: ProgressTrackerProps) {
  const pushToast = useToastStore((state) => state.pushToast);

  // ── Read live pipeline progress from the global store ─────────────────────
  // The store is fed by global Tauri event listeners set up in App.tsx, so
  // state persists across page navigation and is never lost when this
  // component unmounts.
  const lectureState = usePipelineStore(
    (state) => (lectureId ? (state.lectureStates[lectureId] ?? null) : null),
  );
  const { updateStageStatus, bumpStagesComplete, hydrateLecture } = usePipelineStore.getState();

  // Only local state: the in-flight retry/skip action name (pure UI concern).
  const [stageActionName, setStageActionName] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);

  // ── Hydrate from DB on mount / lecture change ─────────────────────────────
  // If there is no live in-memory state (e.g. after an app restart or
  // navigation away from a running pipeline), load the persisted stage
  // records from the database so the UI reflects the true state.
  useEffect(() => {
    if (!lectureId) return;
    let cancelled = false;
    getPipelineStatus(lectureId)
      .then((records) => {
        if (!cancelled && records.length > 0) {
          hydrateLecture(lectureId, records);
        }
      })
      .catch(() => { /* non-fatal – store stays at default pending */ });
    return () => { cancelled = true; };
  }, [lectureId, hydrateLecture]);

  // Derive display values; fall back to default pending state when the store
  // has no entry yet (e.g. very first render before any events arrive).
  const stages =
    lectureState?.stages ?? PIPELINE_STAGE_DEFS.map((s) => ({ ...s, status: "pending" as const }));
  const stagesComplete = lectureState?.stagesComplete ?? 0;
  const streamingTokens = lectureState?.streamingTokens ?? {};
  const sectionProgress = lectureState?.sectionProgress ?? {};
  const isDone = lectureState?.isDone ?? false;
  const pipelineWarning = lectureState?.pipelineWarning ?? null;

  // Fire onPipelineComplete once when isDone first flips to true for the
  // current lectureId. We use a ref so there's no extra render cycle.
  const completionFiredRef = useRef<{ lectureId: string | null; fired: boolean }>({
    lectureId: null,
    fired: false,
  });
  useEffect(() => {
    // Reset tracking whenever the lecture changes.
    if (completionFiredRef.current.lectureId !== lectureId) {
      completionFiredRef.current = { lectureId, fired: isDone };
      return;
    }
    if (isDone && !completionFiredRef.current.fired) {
      completionFiredRef.current.fired = true;
      onPipelineComplete?.();
    }
  }, [lectureId, isDone, onPipelineComplete]);

  if (!lectureId) return null;

  const progressPercent = Math.round((stagesComplete / TOTAL_PIPELINE_STAGES) * 100);

  // Detect an interrupted pipeline: at least one stage finished but some
  // stages are errored/pending and there is no stage currently running.
  const hasCompleted = stages.some((s) => s.status === "complete");
  const hasErrors = stages.some((s) => s.status === "error");
  const isRunning = stages.some((s) => s.status === "running");
  const isInterrupted = hasCompleted && hasErrors && !isRunning && !isDone;

  const stageIndex = (stageName: string) =>
    PIPELINE_STAGE_DEFS.findIndex((s) => s.name === stageName);

  // ── Resume ─────────────────────────────────────────────────────────────────────
  const handleResumePipeline = async () => {
    if (!lectureId || isResuming) return;
    setIsResuming(true);
    // Reset any errored stages back to pending in the UI so the live events
    // coming from the backend will paint them correctly.
    stages.forEach((s) => {
      if (s.status === "error") {
        updateStageStatus(lectureId, s.name, "pending", undefined, undefined);
      }
    });
    try {
      await startPipelineWithOptions(lectureId, { useCache: true });
      pushToast({ kind: "info", message: "Pipeline resumed. Already-completed stages will be skipped via cache." });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      pushToast({ kind: "error", message: `Failed to resume pipeline: ${message}` });
    } finally {
      setIsResuming(false);
    }
  };

  // ── Retry ───────────────────────────────────────────────────────────────────────────
  const handleRetryStage = async (stageName: string) => {
    if (!lectureId || stageActionName) return;

    setStageActionName(stageName);
    updateStageStatus(lectureId, stageName, "running", undefined, undefined);

    try {
      if (stageName === "notes") {
        const notes = await regenerateNotes(lectureId);
        if (!notes) throw new Error("No notes data returned.");
        updateStageStatus(lectureId, stageName, "complete", "Stage retried successfully.");
      } else if (stageName === "quiz") {
        const quiz = await regenerateQuiz(lectureId);
        if (!quiz) throw new Error("No quiz data returned.");
        updateStageStatus(lectureId, stageName, "complete", "Stage retried successfully.");
      } else if (stageName === "mindmap") {
        const mindmap = await regenerateMindmap(lectureId);
        if (!mindmap) throw new Error("No mind map data returned.");
        updateStageStatus(lectureId, stageName, "complete", "Stage retried successfully.");
      } else {
        await startPipeline(lectureId);
        pushToast({
          kind: "info",
          message: `Retrying ${stageName} by restarting the remaining pipeline stages.`,
        });
      }

      const index = stageIndex(stageName);
      if (index >= 0) bumpStagesComplete(lectureId, index + 1);
      pushToast({ kind: "success", message: `Retried "${stageName}" stage.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      updateStageStatus(lectureId, stageName, "error", undefined, message);
      pushToast({ kind: "error", message: `Failed to retry "${stageName}": ${message}` });
    } finally {
      setStageActionName(null);
    }
  };

  // ── Skip ──────────────────────────────────────────────────────────────────
  const handleSkipStage = (stageName: string) => {
    updateStageStatus(lectureId, stageName, "complete", "Skipped by user.");
    const index = stageIndex(stageName);
    if (index >= 0) bumpStagesComplete(lectureId, index + 1);
    pushToast({ kind: "warning", message: `Skipped "${stageName}" stage.` });
  };

  return (
    <section className={`space-y-4 ${className ?? ""}`}>
      {pipelineWarning && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {pipelineWarning}
        </div>
      )}

      {/* Interrupted pipeline banner */}
      {isInterrupted && (
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="flex items-center justify-between gap-4 p-5">
            <div>
              <p className="text-sm font-semibold text-foreground">Pipeline interrupted</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {stagesComplete} of {TOTAL_PIPELINE_STAGES} stages completed. Resume to continue from where it left off.
              </p>
            </div>
            <Button
              type="button"
              variant="default"
              onClick={() => void handleResumePipeline()}
              disabled={isResuming}
              className="flex-shrink-0"
            >
              {isResuming ? "Resuming…" : "Resume Pipeline"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Overall progress bar */}
      <div className="flex items-center gap-3">
        <Progress value={progressPercent} className="h-2 flex-1" />
        <span className="min-w-[3rem] text-right text-xs text-muted-foreground tabular-nums">
          {progressPercent}%
        </span>
      </div>

      {/* Stage list */}
      <div className="space-y-2">
        {stages.map((stage) => {
          const section = sectionProgress[stage.name];
          const sectionProgressText = section
            ? `Sections ${section.completed.length}/${section.total}${section.running ? ` • processing ${section.running}` : ""}`
            : undefined;
          return (
            <StageRow
              key={stage.name}
              stage={stage}
              streamingPreview={streamingTokens[stage.name] ?? ""}
              sectionProgressText={sectionProgressText}
              isMutating={stageActionName === stage.name}
              onRetry={() => void handleRetryStage(stage.name)}
              onSkip={() => handleSkipStage(stage.name)}
            />
          );
        })}
      </div>

      {isDone && (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground shadow-sm">
          All stages complete! Your results are ready to view.
        </div>
      )}
    </section>
  );
}
