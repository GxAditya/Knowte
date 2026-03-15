import { useState } from "react";
import { exportFlashcardsAnki, exportFlashcardsTsv } from "../../lib/tauriApi";
import { useToastStore } from "../../stores";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

interface AnkiExportProps {
  lectureId: string;
  cardCount: number;
}

export default function AnkiExport({ lectureId, cardCount }: AnkiExportProps) {
  const pushToast = useToastStore((state) => state.pushToast);
  const [ankiState, setAnkiState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [tsvState, setTsvState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [ankiPath, setAnkiPath] = useState<string | null>(null);
  const [tsvPath, setTsvPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnkiExport = async () => {
    setAnkiState("loading");
    setError(null);
    try {
      const path = await exportFlashcardsAnki(lectureId);
      if (path) {
        setAnkiPath(path);
        setAnkiState("success");
        pushToast({ kind: "success", message: "Anki package exported successfully." });
      } else {
        // User cancelled the dialog
        setAnkiState("idle");
      }
    } catch (e) {
      setError(String(e));
      setAnkiState("error");
      pushToast({ kind: "error", message: "Failed to export Anki package." });
    }
  };

  const handleTsvExport = async () => {
    setTsvState("loading");
    setError(null);
    try {
      const path = await exportFlashcardsTsv(lectureId);
      if (path) {
        setTsvPath(path);
        setTsvState("success");
        pushToast({ kind: "success", message: "Flashcards text export completed." });
      } else {
        setTsvState("idle");
      }
    } catch (e) {
      setError(String(e));
      setTsvState("error");
      pushToast({ kind: "error", message: "Failed to export flashcards text file." });
    }
  };

  return (
    <div className="bg-card/50 border border-border/50 shadow-sm rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold text-foreground">Export</span>
        <span className="text-xs text-muted-foreground bg-accent rounded-full px-2 py-0.5">
          {cardCount} cards
        </span>
      </div>

      <div className="space-y-3">
        {/* Anki .apkg export */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Anki Package (.apkg)</p>
            <p className="text-xs text-muted-foreground truncate">
              Import directly into Anki desktop app
            </p>
          </div>
          <Button
            type="button"
            data-hotkey-export="true"
            onClick={handleAnkiExport}
            disabled={ankiState === "loading"}
            className={`shrink-0 flex items-center gap-1.5 h-8 text-xs font-medium transition-all ${
              ankiState === "success"
                ? "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-transparent shadow-none"
                : ankiState === "error"
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent shadow-none"
                  : ""
            }`}
          >
            {ankiState === "loading" ? (
              <>
                <Spinner className="mr-2 size-3.5" />
                Exporting…
              </>
            ) : ankiState === "success" ? (
              <>✓ Saved</>
            ) : ankiState === "error" ? (
              <>✗ Failed</>
            ) : (
              <>
                <svg
                  aria-hidden="true"
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export .apkg
              </>
            )}
          </Button>
        </div>

        {ankiState === "success" && ankiPath && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            <p className="text-xs text-green-500 font-medium">Saved to:</p>
            <p className="text-xs text-green-500/90 truncate font-mono mt-0.5">{ankiPath}</p>
            <p className="text-xs text-muted-foreground mt-1.5">
              In Anki: <span className="text-foreground font-medium">File → Import</span> → select the .apkg file
            </p>
          </div>
        )}

        {/* TSV export */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/50">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Tab-Separated (.txt)</p>
            <p className="text-xs text-muted-foreground truncate">
              Import via Anki → File → Import (text format)
            </p>
          </div>
          <Button
            variant="secondary"
            type="button"
            onClick={handleTsvExport}
            disabled={tsvState === "loading"}
            className={`shrink-0 flex items-center gap-1.5 h-8 text-xs font-medium transition-all ${
              tsvState === "success"
                ? "bg-green-500/10 text-green-500 hover:bg-green-500/20 border-transparent shadow-none"
                : tsvState === "error"
                  ? "bg-destructive/10 text-destructive hover:bg-destructive/20 border-transparent shadow-none"
                  : ""
            }`}
          >
            {tsvState === "loading" ? (
              <>
                <Spinner className="mr-2 size-3.5" />
                Exporting…
              </>
            ) : tsvState === "success" ? (
              <>✓ Saved</>
            ) : tsvState === "error" ? (
              <>✗ Failed</>
            ) : (
              <>
                <svg
                  aria-hidden="true"
                  className="w-3.5 h-3.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export .txt
              </>
            )}
          </Button>
        </div>

        {tsvState === "success" && tsvPath && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            <p className="text-xs text-green-500 font-medium">Saved to:</p>
            <p className="text-xs text-green-500/90 truncate font-mono mt-0.5">{tsvPath}</p>
            <p className="text-xs text-muted-foreground mt-1.5">
              In Anki: <span className="text-foreground font-medium">File → Import</span> → select the .txt file → ensure separator is Tab
            </p>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
            <p className="text-xs text-destructive">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}
