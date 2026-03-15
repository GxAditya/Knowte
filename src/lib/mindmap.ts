import type { MindMapData, MindMapNode } from "./types";

type JsonRecord = Record<string, unknown>;

const ROOT_FALLBACK_LABEL = "Main Topic";
const NODE_FALLBACK_PREFIX = "Topic";

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asLabel(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return null;
}

function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);
  return slug.length > 0 ? slug : "node";
}

function coerceArray(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (isRecord(value)) {
    return Object.values(value);
  }
  return [];
}

function extractChildren(raw: JsonRecord): unknown[] {
  const keys = [
    "children",
    "nodes",
    "subtopics",
    "branches",
    "items",
    "concepts",
    "topics",
    "child",
  ] as const;

  for (const key of keys) {
    const children = coerceArray(raw[key]);
    if (children.length > 0) {
      return children;
    }
  }

  return [];
}

function extractLabel(raw: JsonRecord, fallbackLabel: string): string {
  const keys = [
    "label",
    "title",
    "name",
    "topic",
    "concept",
    "text",
    "heading",
    "central_topic",
  ] as const;

  for (const key of keys) {
    const label = asLabel(raw[key]);
    if (label) {
      return label;
    }
  }

  return fallbackLabel;
}

function normalizeNode(
  input: unknown,
  path: number[],
  fallbackLabel: string,
): MindMapNode {
  const raw = isRecord(input) ? input : {};
  const primitiveLabel = asLabel(input);
  const label = primitiveLabel ?? extractLabel(raw, fallbackLabel);
  const children = (primitiveLabel ? [] : extractChildren(raw)).map((child, index) =>
    normalizeNode(child, [...path, index + 1], `${NODE_FALLBACK_PREFIX} ${index + 1}`),
  );

  return {
    id: `mm-${path.join("-")}-${slugify(label)}`,
    label,
    children,
  };
}

export function normalizeMindMapData(input: unknown): MindMapData {
  const raw = isRecord(input) ? input : {};
  const rootCandidate = raw.root ?? raw.mindmap ?? raw.map ?? input;

  if (Array.isArray(rootCandidate)) {
    return {
      root: normalizeNode(
        { label: ROOT_FALLBACK_LABEL, children: rootCandidate },
        [1],
        ROOT_FALLBACK_LABEL,
      ),
    };
  }

  if (isRecord(rootCandidate)) {
    const hasAnyLabel =
      asLabel(rootCandidate.label) ??
      asLabel(rootCandidate.title) ??
      asLabel(rootCandidate.name) ??
      asLabel(rootCandidate.topic) ??
      asLabel(rootCandidate.central_topic);

    if (!hasAnyLabel) {
      const children = extractChildren(rootCandidate);
      if (children.length > 0) {
        return {
          root: normalizeNode(
            { label: ROOT_FALLBACK_LABEL, children },
            [1],
            ROOT_FALLBACK_LABEL,
          ),
        };
      }
    }
  }

  return {
    root: normalizeNode(rootCandidate, [1], ROOT_FALLBACK_LABEL),
  };
}

export function parseMindMapJson(rawJson: string): MindMapData {
  return normalizeMindMapData(JSON.parse(rawJson) as unknown);
}

export function hasMindMapContent(data: MindMapData): boolean {
  const rootLabel = data.root.label.trim();
  return (data.root.children?.length ?? 0) > 0 || rootLabel !== ROOT_FALLBACK_LABEL;
}
