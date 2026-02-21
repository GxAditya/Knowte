import { useMemo, useState } from "react";
import type { Paper } from "../../lib/types";
import PaperCard from "./PaperCard";

type SortKey = "citations" | "year" | "relevance";

interface PaperListProps {
  papers: Paper[];
  isLoading: boolean;
  onRefresh: () => void;
}

export default function PaperList({ papers, isLoading, onRefresh }: PaperListProps) {
  const [sortBy, setSortBy] = useState<SortKey>("citations");
  const [filterPdfOnly, setFilterPdfOnly] = useState(false);
  const [yearFrom, setYearFrom] = useState<string>("");
  const [yearTo, setYearTo] = useState<string>("");

  const filtered = useMemo(() => {
    let list = [...papers];

    if (filterPdfOnly) {
      list = list.filter((p) => p.pdf_url != null);
    }

    const from = yearFrom ? parseInt(yearFrom, 10) : null;
    const to = yearTo ? parseInt(yearTo, 10) : null;
    if (from !== null) list = list.filter((p) => p.year != null && p.year >= from);
    if (to !== null) list = list.filter((p) => p.year != null && p.year <= to);

    switch (sortBy) {
      case "citations":
        list.sort((a, b) => b.citation_count - a.citation_count);
        break;
      case "year":
        list.sort((a, b) => (b.year ?? 0) - (a.year ?? 0));
        break;
      case "relevance":
        // Keep original order (pipeline returns by relevance)
        break;
    }

    return list;
  }, [papers, sortBy, filterPdfOnly, yearFrom, yearTo]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 whitespace-nowrap">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="text-xs px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="citations">Citations</option>
            <option value="year">Year (newest first)</option>
            <option value="relevance">Relevance</option>
          </select>
        </div>

        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={filterPdfOnly}
            onChange={(e) => setFilterPdfOnly(e.target.checked)}
            className="w-3.5 h-3.5 accent-blue-500"
          />
          <span className="text-xs text-slate-400">PDF only</span>
        </label>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400">Year:</span>
          <input
            type="number"
            placeholder="from"
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value)}
            className="w-16 text-xs px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <span className="text-xs text-slate-500">–</span>
          <input
            type="number"
            placeholder="to"
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value)}
            className="w-16 text-xs px-2 py-1 bg-slate-700 border border-slate-600 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="ml-auto">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md border border-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span className="inline-block w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                Searching…
              </>
            ) : (
              <>↻ Refresh Papers</>
            )}
          </button>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-slate-500">
        {filtered.length} paper{filtered.length !== 1 ? "s" : ""} found
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm">
          No papers match the current filters.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((paper) => (
            <PaperCard key={paper.paper_id} paper={paper} />
          ))}
        </div>
      )}
    </div>
  );
}
