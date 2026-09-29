import type { TreeNodeDto } from "../../../lib/types";

export interface TreeEntry {
  path: string;
  name: string;
  kind: "blob" | "tree";
  children: TreeEntry[];
}

export interface FlatTreeRow {
  entry: TreeEntry;
  depth: number;
  expanded: boolean;
}

export function parentPath(path: string): string | null {
  const index = path.lastIndexOf("/");
  return index > 0 ? path.slice(0, index) : null;
}

export function ancestorPaths(path: string): string[] {
  const parts = path.split("/");
  const ancestors: string[] = [];
  for (let index = 1; index < parts.length; index += 1) {
    ancestors.push(parts.slice(0, index).join("/"));
  }
  return ancestors;
}

function compareEntries(a: TreeEntry, b: TreeEntry): number {
  if (a.kind !== b.kind) {
    return a.kind === "tree" ? -1 : 1;
  }
  return a.name.localeCompare(b.name);
}

function sortEntries(entries: TreeEntry[]): void {
  for (const entry of entries) {
    if (entry.children.length > 0) {
      entry.kind = "tree";
    }
  }
  entries.sort(compareEntries);
  for (const entry of entries) {
    sortEntries(entry.children);
  }
}

export function buildTree(nodes: readonly TreeNodeDto[]): TreeEntry[] {
  const sorted = [...nodes].sort((a, b) => a.path.localeCompare(b.path));
  const byPath = new Map<string, TreeEntry>();
  const roots: TreeEntry[] = [];

  function ensureDirectory(path: string): TreeEntry {
    const existing = byPath.get(path);
    if (existing) {
      return existing;
    }
    const created: TreeEntry = {
      path,
      name: path.split("/").pop() ?? path,
      kind: "tree",
      children: [],
    };
    byPath.set(path, created);
    const parent = parentPath(path);
    if (parent) {
      ensureDirectory(parent).children.push(created);
    } else {
      roots.push(created);
    }
    return created;
  }

  for (const node of sorted) {
    if (byPath.has(node.path)) {
      continue;
    }
    const entry: TreeEntry = {
      path: node.path,
      name: node.name,
      kind: node.is_dir ? "tree" : "blob",
      children: [],
    };
    byPath.set(node.path, entry);
    const parent = parentPath(node.path);
    if (parent) {
      ensureDirectory(parent).children.push(entry);
    } else {
      roots.push(entry);
    }
  }

  sortEntries(roots);
  return roots;
}

export function flattenTree(
  roots: readonly TreeEntry[],
  expanded: ReadonlySet<string>,
): FlatTreeRow[] {
  const rows: FlatTreeRow[] = [];
  function walk(entries: readonly TreeEntry[], depth: number): void {
    for (const entry of entries) {
      const isExpanded = expanded.has(entry.path);
      rows.push({ entry, depth, expanded: isExpanded });
      if (entry.kind === "tree" && isExpanded) {
        walk(entry.children, depth + 1);
      }
    }
  }
  walk(roots, 0);
  return rows;
}

export function expandAncestors(path: string, current: ReadonlySet<string>): Set<string> {
  const next = new Set(current);
  for (const ancestor of ancestorPaths(path)) {
    next.add(ancestor);
  }
  return next;
}

export function findRowIndex(rows: readonly FlatTreeRow[], path: string): number {
  return rows.findIndex((row) => row.entry.path === path);
}

const KIB = 1024;

export function formatBytes(size: number | null | undefined): string {
  if (size === null || size === undefined) {
    return "";
  }
  if (size < KIB) {
    return `${size} B`;
  }
  if (size < KIB * KIB) {
    return `${(size / KIB).toFixed(1)} KB`;
  }
  return `${(size / (KIB * KIB)).toFixed(1)} MB`;
}
