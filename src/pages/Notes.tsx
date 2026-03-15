import { useCallback, useEffect, useState } from "react";
import { ExplainableTextView } from "../components";
import { NotesSkeleton } from "../components/Skeletons";
import { NotesExport, StructuredNotesView } from "../components/Notes";
import { ViewHeader } from "../components/Layout";
import { parseStructuredNotesJson } from "../lib/generatedContent";
import { getNotes, regenerateNotes } from "../lib/tauriApi";
import type { StructuredNotes } from "../lib/types";
import { useLectureStore, usePipelineStore, useToastStore, useUiStore } from "../stores";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

// ─── Table of Contents ────────────────────────────────────────────────────────

interface TocItem {
  id: string;
  label: string;
  level: "h1" | "h2";
}

function buildToc(notes: StructuredNotes, hasSummary: boolean): TocItem[] {
  const items: TocItem[] = [];

  if (hasSummary) {
    items.push({ id: "summary", label: "Summary", level: "h2" });
  }

  (notes.topics ?? []).forEach((topic, i) => {
    items.push({ id: `topic-${i}`, label: topic.heading, level: "h2" });
  });

  if ((notes.key_terms ?? []).length > 0) {
    items.push({ id: "key-terms", label: "Key Terms", level: "h2" });
  }

  if ((notes.takeaways ?? []).length > 0) {
    items.push({ id: "takeaways", label: "Key Takeaways", level: "h2" });
  }

  return items;
}

interface TableOfContentsProps {
  items: TocItem[];
  activeId: string | null;
}

function TableOfContents({ items, activeId }: TableOfContentsProps) {
  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <nav className="space-y-1">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Contents
      </p>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => scrollTo(item.id)}
          className={`block w-full text-left text-sm px-3 py-1.5 rounded-md transition-colors ${activeId === item.id
              ? "text-primary bg-primary/10 font-medium"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
            } ${item.level === "h2" ? "pl-3" : "pl-5"}`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

// ─── Active section tracker ───────────────────────────────────────────────────

function useActiveSection(ids: string[]) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length === 0) return;

    const observers = ids.map((id) => {
      const el = document.getElementById(id);
      if (!el) return null;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveId(id);
          }
        },
        { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
      );
      observer.observe(el);
      return observer;
    });

    return () => {
      observers.forEach((o) => o?.disconnect());
    };
  }, [ids]);

  return activeId;
}

// ─── Empty / Loading States ───────────────────────────────────────────────────

function EmptyState({
  reason,
  detail,
}: {
  reason: "no-lecture" | "no-notes";
  detail?: string | null;
}) {
  if (reason === "no-lecture") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-2">
        <span className="text-4xl">📝</span>
        <p className="text-sm">No knowte selected.</p>
        <p className="text-xs">Add and process a knowte to view notes.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground space-y-2">
      <span className="text-4xl">📝</span>
      <p className="text-sm font-medium text-foreground">No notes generated yet.</p>
      <p className="text-xs">Run the processing pipeline to generate structured notes.</p>
      {detail && (
        <p className="max-w-md rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-center text-xs text-destructive">
          {detail}
        </p>
      )}
    </div>
  );
}

// ─── Notes Page ───────────────────────────────────────────────────────────────

export default function Notes() {
  const { currentLectureId, lectures } = useLectureStore();
  const isSidebarCollapsed = useUiStore((state) => state.isSidebarCollapsed);
  const pushToast = useToastStore((state) => state.pushToast);
  const notesStageError = usePipelineStore((state) =>
    currentLectureId
      ? state.lectureStates[currentLectureId]?.stages.find((stage) => stage.name === "notes")
        ?.error ?? null
      : null,
  );
  const currentLecture = lectures.find((l) => l.id === currentLectureId) ?? null;

  const [notes, setNotes] = useState<StructuredNotes | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isOutlineOpen, setIsOutlineOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const applyNotesPayload = useCallback((raw: string, invalidMessage: string) => {
    const parsed = parseStructuredNotesJson(raw);
    if (!parsed) {
      setNotes(null);
      setError(invalidMessage);
      return false;
    }

    setNotes(parsed);
    return true;
  }, []);

  const loadNotes = useCallback(async () => {
    if (!currentLectureId) {
      setNotes(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setNotes(null);
    setError(null);
    setIsLoading(true);

    try {
      const raw = await getNotes(currentLectureId);
      if (!raw) {
        setNotes(null);
        return;
      }

      if (!applyNotesPayload(raw, "Stored notes data is invalid or incomplete.")) {
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [applyNotesPayload, currentLectureId]);

  // ── Load notes from backend ─────────────────────────────────────────────────
  useEffect(() => {
    void loadNotes();
  }, [loadNotes]);

  // ── Regenerate ──────────────────────────────────────────────────────────────
  const handleRegenerate = useCallback(async () => {
    if (!currentLectureId || isRegenerating) return;
    setIsRegenerating(true);
    setError(null);

    try {
      const raw = await regenerateNotes(currentLectureId);
      if (raw) {
        if (applyNotesPayload(raw, "Regenerated notes data is invalid or incomplete.")) {
          pushToast({ kind: "success", message: "Notes regenerated successfully." });
        } else {
          pushToast({ kind: "error", message: "Notes regeneration returned invalid data." });
        }
      } else {
        pushToast({ kind: "warning", message: "Notes regeneration returned no data." });
      }
    } catch (err) {
      setError(typeof err === "string" ? err : "Failed to regenerate notes.");
      pushToast({ kind: "error", message: "Failed to regenerate notes." });
    } finally {
      setIsRegenerating(false);
    }
  }, [applyNotesPayload, currentLectureId, isRegenerating, pushToast]);

  // ── ToC ─────────────────────────────────────────────────────────────────────
  const tocItems = notes ? buildToc(notes, Boolean(currentLecture?.summary)) : [];
  const tocIds = tocItems.map((item) => item.id);
  const activeId = useActiveSection(tocIds);
  const hasNotesContent = Boolean(
    notes &&
    (notes.topics.length > 0 ||
      notes.key_terms.length > 0 ||
      notes.takeaways.length > 0 ||
      currentLecture?.summary),
  );
  const notesContainerClass = isSidebarCollapsed
    ? "mx-auto w-full max-w-[1240px] space-y-6"
    : "mx-auto w-full max-w-[900px] space-y-6";

  useEffect(() => {
    if (isSidebarCollapsed) {
      setIsOutlineOpen(false);
    }
  }, [isSidebarCollapsed]);

  // ── No lecture ──────────────────────────────────────────────────────────────
  if (!currentLectureId || !currentLecture) {
    return (
      <div className={notesContainerClass}>
        <ViewHeader
          title="Notes"
          description="Structured summaries, key concepts, and takeaways."
        />
        <EmptyState reason="no-lecture" />
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className={notesContainerClass}>
        <ViewHeader title="Notes" description={currentLecture.filename} />
        <NotesSkeleton />
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className={notesContainerClass}>
        <ViewHeader title="Notes" description={currentLecture.filename} />
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive text-sm">
          <p className="font-medium mb-1">Failed to load notes</p>
          <p className="text-xs opacity-80">{error}</p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={() => void loadNotes()}
          >
            Retry
          </Button>
          <Button
            onClick={() => void handleRegenerate()}
            disabled={isRegenerating}
            className="flex items-center gap-2"
          >
            {isRegenerating ? (
              <>
                <Spinner className="mr-2 size-4" />
                Regenerating…
              </>
            ) : (
              "Regenerate Notes"
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ── No notes yet ────────────────────────────────────────────────────────────
  if (!notes || !hasNotesContent) {
    return (
      <div className={notesContainerClass}>
        <ViewHeader
          title="Notes"
          description={currentLecture.filename}
          actions={
            <Button
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-2"
            >
              {isRegenerating ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Generating…
                </>
              ) : (
                "Generate Notes"
              )}
            </Button>
          }
        />
        <EmptyState reason="no-notes" detail={notesStageError} />
      </div>
    );
  }

  // ── Main view ───────────────────────────────────────────────────────────────
  return (
    <div className={notesContainerClass}>
      <ViewHeader
        title="Notes"
        description={currentLecture.filename}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setIsOutlineOpen((previous) => !previous)}
            >
              {isOutlineOpen ? "Hide Outline" : "Show Outline"}
            </Button>
            <Button
              variant="secondary"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="flex items-center gap-2"
            >
              {isRegenerating ? (
                <>
                  <Spinner className="mr-2 size-4" />
                  Regenerating…
                </>
              ) : (
                "Regenerate"
              )}
            </Button>
          </div>
        }
      />

      {isOutlineOpen && (
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm lg:hidden">
          <TableOfContents items={tocItems} activeId={activeId} />
        </div>
      )}

      <div className="relative flex h-full gap-6">
        {isOutlineOpen && (
          <aside className="hidden w-56 flex-shrink-0 lg:block">
            <div className="sticky top-6 rounded-lg border border-border bg-card p-3 shadow-sm">
              <TableOfContents items={tocItems} activeId={activeId} />
            </div>
          </aside>
        )}

        {/* ── Main document area ─────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Export bar */}
          <NotesExport
            lectureId={currentLectureId}
            notes={notes}
            summary={currentLecture.summary}
          />

          {/* Notes document */}
          <ExplainableTextView lectureId={currentLectureId}>
            <StructuredNotesView notes={notes} summary={currentLecture.summary} />
          </ExplainableTextView>
        </div>
      </div>
    </div>
  );
}
