export type SummaryBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "unordered_list"; items: string[] }
  | { type: "ordered_list"; items: string[] };

function findFirstIndex(haystack: string, markers: string[]): number {
  const indices = markers
    .map((marker) => haystack.indexOf(marker))
    .filter((index) => index >= 0);
  return indices.length > 0 ? Math.min(...indices) : -1;
}

export function sanitizeSummaryText(raw?: string): string {
  if (!raw) return "";

  let text = raw
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("```"))
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();

  if (!text) return "";

  // Remove trailing rationale/meta sections commonly added by chatty responses.
  const lower = text.toLowerCase();
  const rationaleCut = findFirstIndex(lower, [
    "\n**rationale",
    "\nrationale for language",
    "\nrationale:",
  ]);
  if (rationaleCut >= 0) {
    text = text.slice(0, rationaleCut).trimEnd();
  }

  // Remove follow-up assistant prompts from the tail.
  const lowerAfterRationale = text.toLowerCase();
  for (const marker of [
    "would you like",
    "let me know if you'd like",
    "if you'd like,",
    "i can also",
  ]) {
    const index = lowerAfterRationale.indexOf(marker);
    if (index >= Math.floor(lowerAfterRationale.length * 0.5)) {
      text = text.slice(0, index).trimEnd();
      break;
    }
  }

  // Drop conversational preface if it appears before obvious structured content.
  const contentMarker = /(\*\*[^*\n]{2,80}:\*\*|#{1,4}\s+[^\n]+|(?:^|\n)\s*(?:[-*]|\d+[.)])\s+)/m;
  const markerMatch = contentMarker.exec(text);
  if (markerMatch && markerMatch.index > 0 && markerMatch.index < 700) {
    const prefix = text.slice(0, markerMatch.index).toLowerCase();
    if (
      prefix.startsWith("okay") ||
      prefix.startsWith("sure") ||
      prefix.startsWith("certainly") ||
      prefix.startsWith("of course") ||
      prefix.includes("here's") ||
      prefix.includes("here is") ||
      prefix.includes("here’s") ||
      prefix.includes("summary")
    ) {
      text = text.slice(markerMatch.index).trimStart();
    }
  }

  return text
    .replace(/\n-{3,}\s*$/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isStructuralLine(line: string): boolean {
  return (
    /^#{1,4}\s+/.test(line) ||
    /^\*\*[^*\n]{2,80}:\*\*/.test(line) ||
    /^[-*]\s+/.test(line) ||
    /^\d+[.)]\s+/.test(line) ||
    /^-{3,}\s*$/.test(line)
  );
}

export function parseSummaryBlocks(raw?: string): SummaryBlock[] {
  const text = sanitizeSummaryText(raw);
  if (!text) return [];

  const blocks: SummaryBlock[] = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line) {
      i += 1;
      continue;
    }

    if (/^-{3,}\s*$/.test(line)) {
      i += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length <= 2 ? 2 : 3,
        text: headingMatch[2].trim(),
      });
      i += 1;
      continue;
    }

    const boldLabelMatch = line.match(/^\*\*([^*\n]{2,80}):\*\*\s*(.*)$/);
    if (boldLabelMatch) {
      blocks.push({
        type: "heading",
        level: 3,
        text: boldLabelMatch[1].trim(),
      });
      if (boldLabelMatch[2]) {
        blocks.push({
          type: "paragraph",
          text: boldLabelMatch[2].trim(),
        });
      }
      i += 1;
      continue;
    }

    const plainLabelMatch = line.match(/^([A-Z][A-Za-z0-9 /-]{2,60}):\s+(.+)$/);
    if (plainLabelMatch) {
      blocks.push({
        type: "heading",
        level: 3,
        text: plainLabelMatch[1].trim(),
      });
      blocks.push({
        type: "paragraph",
        text: plainLabelMatch[2].trim(),
      });
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const listLine = lines[i].trim();
        if (!/^[-*]\s+/.test(listLine)) break;
        items.push(listLine.replace(/^[-*]\s+/, "").trim());
        i += 1;
      }
      if (items.length > 0) {
        blocks.push({ type: "unordered_list", items });
      }
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const listLine = lines[i].trim();
        if (!/^\d+[.)]\s+/.test(listLine)) break;
        items.push(listLine.replace(/^\d+[.)]\s+/, "").trim());
        i += 1;
      }
      if (items.length > 0) {
        blocks.push({ type: "ordered_list", items });
      }
      continue;
    }

    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const paragraphLine = lines[i].trim();
      if (!paragraphLine) break;
      if (isStructuralLine(paragraphLine) && paragraphLines.length > 0) break;
      paragraphLines.push(paragraphLine);
      i += 1;
    }

    if (paragraphLines.length > 0) {
      blocks.push({
        type: "paragraph",
        text: paragraphLines.join(" "),
      });
    } else {
      i += 1;
    }
  }

  if (blocks.length === 0) {
    return [{ type: "paragraph", text }];
  }

  return blocks;
}
