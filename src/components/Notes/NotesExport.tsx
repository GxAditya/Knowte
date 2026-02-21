import { useState } from "react";
import type { StructuredNotes } from "../../lib/types";
import { exportNotesMarkdown } from "../../lib/tauriApi";

// ─── Markdown Conversion ──────────────────────────────────────────────────────

function notesToMarkdown(notes: StructuredNotes, summary?: string): string {
  const lines: string[] = [];

  lines.push(`# ${notes.title}`, "");

  if (summary) {
    lines.push("## Summary", "", summary, "");
  }

  for (const topic of notes.topics ?? []) {
    lines.push(`## ${topic.heading}`, "");

    const keyPoints = topic.key_points ?? [];
    if (keyPoints.length > 0) {
      lines.push("### Key Points", "");
      for (const p of keyPoints) {
        lines.push(`- ${p}`);
      }
      lines.push("");
    }

    if (topic.details) {
      lines.push(topic.details, "");
    }

    const examples = topic.examples ?? [];
    if (examples.length > 0) {
      lines.push("### Examples", "");
      for (const ex of examples) {
        lines.push(`> ${ex}`, "");
      }
    }
  }

  const keyTerms = notes.key_terms ?? [];
  if (keyTerms.length > 0) {
    lines.push("## Key Terms", "");
    lines.push("| Term | Definition |");
    lines.push("|------|------------|");
    for (const item of keyTerms) {
      lines.push(`| **${item.term}** | ${item.definition} |`);
    }
    lines.push("");
  }

  const takeaways = notes.takeaways ?? [];
  if (takeaways.length > 0) {
    lines.push("## Key Takeaways", "");
    takeaways.forEach((t, i) => {
      lines.push(`${i + 1}. ${t}`);
    });
    lines.push("");
  }

  return lines.join("\n");
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastState {
  message: string;
  type: "success" | "error";
}

function useToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  return { toast, showToast };
}

// ─── NotesExport Component ────────────────────────────────────────────────────

export interface NotesExportProps {
  lectureId: string;
  notes: StructuredNotes;
  summary?: string;
}

export function NotesExport({ lectureId, notes, summary }: NotesExportProps) {
  const { toast, showToast } = useToast();
  const [savingMd, setSavingMd] = useState(false);

  async function handleCopyMarkdown() {
    try {
      const md = notesToMarkdown(notes, summary);
      await navigator.clipboard.writeText(md);
      showToast("Copied to clipboard!", "success");
    } catch {
      showToast("Failed to copy to clipboard", "error");
    }
  }

  async function handleDownloadMarkdown() {
    if (savingMd) return;
    setSavingMd(true);
    try {
      const saved = await exportNotesMarkdown(lectureId);
      if (saved) {
        showToast("Markdown file saved!", "success");
      }
    } catch (e) {
      showToast(`Export failed: ${String(e)}`, "error");
    } finally {
      setSavingMd(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <>
      {/* Print stylesheet ─ hidden from screen, visible only when printing */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white; color: black; }
          article { max-width: 100%; }
        }
      `}</style>

      <div className="flex items-center gap-3 flex-wrap no-print">
        <button
          onClick={handleCopyMarkdown}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors"
        >
          <span>📋</span> Copy as Markdown
        </button>

        <button
          onClick={handleDownloadMarkdown}
          disabled={savingMd}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-200 rounded-lg text-sm font-medium transition-colors"
        >
          <span>⬇️</span> {savingMd ? "Saving…" : "Download as Markdown"}
        </button>

        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors"
        >
          <span>🖨️</span> Download as PDF
        </button>
      </div>

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-lg shadow-xl text-sm font-medium transition-all no-print ${
            toast.type === "success"
              ? "bg-emerald-700 text-emerald-50"
              : "bg-red-700 text-red-50"
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
