import { useMemo, useState } from "react";
import type { Paper } from "../../lib/types";
import PaperCard from "./PaperCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
          <label className="text-xs text-muted-foreground whitespace-nowrap">Sort by:</label>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="citations">Citations</SelectItem>
              <SelectItem value="year">Year (newest first)</SelectItem>
              <SelectItem value="relevance">Relevance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <Switch
            checked={filterPdfOnly}
            onCheckedChange={setFilterPdfOnly}
          />
          <span className="text-xs font-medium text-foreground">PDF only</span>
        </label>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Year:</span>
          <Input
            placeholder="from"
            value={yearFrom}
            onChange={(e) => setYearFrom(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-16 text-xs px-3 py-1.5 h-8"
          />
          <span className="text-xs text-muted-foreground">–</span>
          <Input
            placeholder="to"
            value={yearTo}
            onChange={(e) => setYearTo(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-16 text-xs px-3 py-1.5 h-8"
          />
        </div>

        <div className="ml-auto">
          <Button
            variant="secondary"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-8 px-3 py-1.5 text-xs"
          >
            {isLoading ? (
              <>
                <Spinner className="mr-2 size-3" />
                Searching…
              </>
            ) : (
              <>↻ Refresh Papers</>
            )}
          </Button>
        </div>
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} paper{filtered.length !== 1 ? "s" : ""} found
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center">
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
