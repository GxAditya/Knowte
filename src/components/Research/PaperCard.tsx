import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { Paper } from "../../lib/types";

interface PaperCardProps {
  paper: Paper;
}

export default function PaperCard({ paper }: PaperCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleOpenPaper = async () => {
    try {
      await openUrl(paper.url);
    } catch {
      window.open(paper.url, "_blank", "noopener,noreferrer");
    }
  };

  const handleOpenPdf = async () => {
    if (!paper.pdf_url) return;
    try {
      await openUrl(paper.pdf_url);
    } catch {
      window.open(paper.pdf_url, "_blank", "noopener,noreferrer");
    }
  };

  const authorLine =
    paper.authors.length === 0
      ? "Unknown authors"
      : paper.authors.length <= 3
        ? paper.authors.join(", ")
        : `${paper.authors[0]} et al.`;

  return (
    <div className="glass-panel p-5 space-y-4 hover:border-[var(--accent-primary)] hover:shadow-[var(--card-shadow-hover)] transition-all duration-300">
      {/* Header row */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] leading-snug line-clamp-2">
          {paper.title}
        </h3>
        <p className="text-xs text-[var(--text-muted)]">{authorLine}</p>
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap gap-2 text-xs">
        {paper.year != null && (
          <span className="badge badge-neutral">
            {paper.year}
          </span>
        )}
        {paper.venue && (
          <span className="badge badge-neutral truncate max-w-[200px]">
            {paper.venue}
          </span>
        )}
        <span className="badge badge-info whitespace-nowrap">
          {paper.citation_count.toLocaleString()} citations
        </span>
        {paper.pdf_url && (
          <span className="badge badge-success whitespace-nowrap">
            Open Access PDF
          </span>
        )}
      </div>

      {/* Abstract toggle */}
      {paper.abstract_text && (
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-[var(--accent-primary)] hover:text-[var(--color-info)] transition-colors"
          >
            {expanded ? "Hide abstract ▲" : "View abstract ▼"}
          </button>
          {expanded && (
            <p className="mt-2 text-xs text-[var(--text-secondary)] leading-relaxed line-clamp-5">
              {paper.abstract_text}
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleOpenPaper}
          className="btn-primary !px-4 !py-1.5 !text-xs !rounded-md"
        >
          Open Paper ↗
        </button>
        {paper.pdf_url && (
          <button
            onClick={handleOpenPdf}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[var(--color-success)] hover:brightness-110 rounded-md shadow-[var(--card-shadow-success)] transition-all"
          >
            Download PDF ↓
          </button>
        )}
      </div>
    </div>
  );
}
