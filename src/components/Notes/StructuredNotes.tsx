import { useMemo, useState, type ReactNode } from "react";
import type { NotesTerm, NotesTopic, StructuredNotes } from "../../lib/types";
import { parseSummaryBlocks, type SummaryBlock } from "./summaryFormatting";

function renderInlineMarkdown(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\n]+\*|_[^_\n]+_)/g;
  let cursor = 0;
  let token = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) {
      parts.push(text.slice(cursor, match.index));
    }

    const raw = match[0];
    const content = raw.slice(2, -2).trim();
    if (raw.startsWith("**") || raw.startsWith("__")) {
      parts.push(<strong key={`s-${token}`}>{content}</strong>);
    } else {
      const italicContent = raw.slice(1, -1).trim();
      parts.push(<em key={`e-${token}`}>{italicContent}</em>);
    }

    cursor = pattern.lastIndex;
    token += 1;
  }

  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return parts.length > 0 ? parts : [text];
}

function renderSummaryBlock(block: SummaryBlock, index: number) {
  if (block.type === "heading") {
    return (
      <h3
        key={index}
        className={
          block.level === 2
            ? "text-lg font-semibold text-violet-300"
            : "text-base font-semibold text-slate-100"
        }
      >
        {renderInlineMarkdown(block.text)}
      </h3>
    );
  }

  if (block.type === "paragraph") {
    return (
      <p key={index} className="text-slate-300 leading-7">
        {renderInlineMarkdown(block.text)}
      </p>
    );
  }

  if (block.type === "unordered_list") {
    return (
      <ul key={index} className="space-y-2">
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex} className="flex items-start gap-3">
            <span className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-violet-500" />
            <span className="text-slate-200 leading-7">{renderInlineMarkdown(item)}</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ol key={index} className="space-y-3">
      {block.items.map((item, itemIndex) => (
        <li key={itemIndex} className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-800/60 text-blue-200 text-sm font-semibold flex items-center justify-center">
            {itemIndex + 1}
          </span>
          <span className="text-slate-200 leading-7">{renderInlineMarkdown(item)}</span>
        </li>
      ))}
    </ol>
  );
}

// ─── Collapsible Topic Section ────────────────────────────────────────────────

interface CollapsibleTopicProps {
  topic: NotesTopic;
  topicIndex: number;
}

function CollapsibleTopic({ topic, topicIndex }: CollapsibleTopicProps) {
  const [open, setOpen] = useState(true);
  const id = `topic-${topicIndex}`;

  // Guard against LLM omitting optional arrays
  const keyPoints = topic.key_points ?? [];
  const examples = topic.examples ?? [];

  return (
    <section id={id} className="mb-8">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 w-full text-left group mb-1"
        aria-expanded={open}
      >
        <span className="text-violet-400 text-lg leading-none select-none transition-transform group-hover:text-violet-300">
          {open ? "▾" : "▸"}
        </span>
        <h2 className="text-xl font-semibold text-slate-100 group-hover:text-violet-300 transition-colors leading-snug">
          {topic.heading}
        </h2>
      </button>

      {open && (
        <div className="mt-4 pl-5 border-l-2 border-slate-700 space-y-5">
          {/* Key Points */}
          {keyPoints.length > 0 && (
            <ul className="space-y-2">
              {keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-2 flex-shrink-0 w-2 h-2 rounded-full bg-violet-500" />
                  <span className="text-slate-200 leading-7">{point}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Details paragraph */}
          {topic.details && (
            <p className="text-slate-300 leading-7 text-[0.95rem]">{topic.details}</p>
          )}

          {/* Examples */}
          {examples.length > 0 && (
            <div className="space-y-2">
              {examples.map((ex, i) => (
                <div
                  key={i}
                  className="bg-blue-950/50 border border-blue-800/40 rounded-lg px-4 py-3"
                >
                  <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
                    Example
                  </p>
                  <p className="text-slate-200 text-sm leading-relaxed">{ex}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ─── Key Terms Table ──────────────────────────────────────────────────────────

function KeyTermsTable({ terms }: { terms: NotesTerm[] }) {
  return (
    <section id="key-terms" className="mb-8">
      <h2 className="text-xl font-semibold text-slate-100 mb-4">Key Terms</h2>
      <div className="overflow-hidden rounded-lg border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-700/60">
              <th className="text-left px-4 py-2.5 text-slate-300 font-semibold w-1/3">
                Term
              </th>
              <th className="text-left px-4 py-2.5 text-slate-300 font-semibold">
                Definition
              </th>
            </tr>
          </thead>
          <tbody>
            {terms.map((item, i) => (
              <tr
                key={i}
                className={
                  i % 2 === 0
                    ? "bg-slate-800/60"
                    : "bg-slate-800/20"
                }
              >
                <td className="px-4 py-2.5 font-medium text-violet-300 align-top">
                  {item.term}
                </td>
                <td className="px-4 py-2.5 text-slate-300 leading-relaxed">
                  {item.definition}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ─── Takeaways Box ────────────────────────────────────────────────────────────

function TakeawaysBox({ takeaways }: { takeaways: string[] }) {
  return (
    <section id="takeaways" className="mb-8">
      <div className="bg-amber-950/30 border border-amber-700/40 rounded-xl p-6">
        <h2 className="text-xl font-semibold text-amber-300 mb-4">Key Takeaways</h2>
        <ol className="space-y-3">
          {takeaways.map((t, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-700/50 text-amber-300 text-sm font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-slate-200 leading-7">{t}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ─── Main StructuredNotes Component ──────────────────────────────────────────

export interface StructuredNotesProps {
  notes: StructuredNotes;
  summary?: string;
}

export function StructuredNotesView({ notes, summary }: StructuredNotesProps) {
  // Guard against LLM omitting top-level arrays
  const topics = notes.topics ?? [];
  const keyTerms = notes.key_terms ?? [];
  const takeaways = notes.takeaways ?? [];
  const summaryBlocks = useMemo(() => parseSummaryBlocks(summary), [summary]);

  return (
    <article className="space-y-2">
      {/* Document Title */}
      <header className="border-b border-slate-700 pb-6 mb-8">
        <h1 className="text-3xl font-bold text-slate-50 leading-tight">{notes.title}</h1>
      </header>

      {/* Summary Section */}
      {summaryBlocks.length > 0 && (
        <section id="summary" className="mb-8">
          <h2 className="text-xl font-semibold text-slate-100 mb-3">Summary</h2>
          <div className="rounded-xl border border-slate-700/80 bg-slate-800/35 p-5 space-y-4">
            {summaryBlocks.map((block, index) => renderSummaryBlock(block, index))}
          </div>
        </section>
      )}

      {/* Topics */}
      {topics.map((topic, i) => (
        <CollapsibleTopic key={i} topic={topic} topicIndex={i} />
      ))}

      {/* Key Terms */}
      {keyTerms.length > 0 && <KeyTermsTable terms={keyTerms} />}

      {/* Takeaways */}
      {takeaways.length > 0 && <TakeawaysBox takeaways={takeaways} />}
    </article>
  );
}
