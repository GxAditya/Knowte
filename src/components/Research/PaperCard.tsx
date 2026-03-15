import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { Paper } from "../../lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
    <div className="bg-card p-5 space-y-4 rounded-xl border border-border hover:border-primary hover:shadow-md transition-all duration-300">
      {/* Header row */}
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
          {paper.title}
        </h3>
        <p className="text-xs text-muted-foreground">{authorLine}</p>
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap gap-2 text-xs">
        {paper.year != null && (
          <Badge variant="secondary" className="font-normal">
            {paper.year}
          </Badge>
        )}
        {paper.venue && (
          <Badge variant="secondary" className="font-normal truncate max-w-[200px]">
            {paper.venue}
          </Badge>
        )}
        <Badge variant="outline" className="font-normal whitespace-nowrap bg-blue-500/10 text-blue-600 border-blue-500/20">
          {paper.citation_count.toLocaleString()} citations
        </Badge>
        {paper.pdf_url && (
          <Badge variant="outline" className="font-normal whitespace-nowrap bg-green-500/10 text-green-600 border-green-500/20">
            Open Access PDF
          </Badge>
        )}
      </div>

      {/* Abstract toggle */}
      {paper.abstract_text && (
        <div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            {expanded ? "Hide abstract ▲" : "View abstract ▼"}
          </button>
          {expanded && (
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed line-clamp-5">
              {paper.abstract_text}
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1">
        <Button
          onClick={handleOpenPaper}
          variant="secondary"
          className="h-8 px-4 py-1.5 text-xs rounded-md"
        >
          Open Paper ↗
        </Button>
        {paper.pdf_url && (
          <Button
            onClick={handleOpenPdf}
            className="h-8 px-4 py-1.5 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-md shadow-sm transition-all"
          >
            Download PDF ↓
          </Button>
        )}
      </div>
    </div>
  );
}
