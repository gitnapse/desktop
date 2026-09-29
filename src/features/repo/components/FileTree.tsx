import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import {
  File,
  FileCode,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
} from "lucide-react";
import { iconSize, iconStroke } from "../../../ui";
import type { TreeNodeDto } from "../../../lib/types";
import {
  buildTree,
  expandAncestors,
  findRowIndex,
  flattenTree,
  parentPath,
} from "../lib/tree";
import type { TreeEntry } from "../lib/tree";
import { QueryFeedback } from "./QueryFeedback";

export interface FileTreeProps {
  nodes: readonly TreeNodeDto[];
  selectedPath?: string | null;
  onSelect: (entry: TreeEntry) => void;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

const CODE_EXTENSIONS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "rs", "py", "go", "rb", "php", "swift",
  "kt", "kts", "java", "c", "h", "cpp", "hpp", "cc", "css", "scss", "sass",
  "html", "htm", "xml", "svg", "vue", "sh", "bash", "zsh", "sql", "yaml", "yml",
  "toml", "lua",
]);

const TEXT_EXTENSIONS = new Set(["md", "markdown", "mdx", "txt", "rst", "log"]);
const JSON_EXTENSIONS = new Set(["json", "jsonc", "lock"]);

function iconFor(entry: TreeEntry, expanded: boolean): LucideIcon {
  if (entry.kind === "tree") {
    return expanded ? FolderOpen : Folder;
  }
  const name = entry.name.toLowerCase();
  const dot = name.lastIndexOf(".");
  const extension = dot === -1 ? "" : name.slice(dot + 1);
  if (JSON_EXTENSIONS.has(extension)) {
    return FileJson;
  }
  if (TEXT_EXTENSIONS.has(extension)) {
    return FileText;
  }
  if (CODE_EXTENSIONS.has(extension)) {
    return FileCode;
  }
  return File;
}

export function FileTree({
  nodes,
  selectedPath = null,
  onSelect,
  loading = false,
  error = null,
  onRetry,
}: FileTreeProps) {
  const roots = useMemo(() => buildTree(nodes), [nodes]);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const [focusIndex, setFocusIndex] = useState(0);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const rows = useMemo(() => flattenTree(roots, expanded), [roots, expanded]);

  useEffect(() => {
    if (!selectedPath) {
      return;
    }
    setExpanded((current) => expandAncestors(selectedPath, current));
    const index = findRowIndex(rows, selectedPath);
    if (index >= 0) {
      setFocusIndex(index);
      window.requestAnimationFrame(() => {
        itemRefs.current[index]?.scrollIntoView({ block: "nearest" });
      });
    }
  }, [selectedPath, nodes]);

  function toggle(path: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function reveal(path: string) {
    const entry = rows.find((row) => row.entry.path === path)?.entry;
    setExpanded((current) => {
      const next = expandAncestors(path, current);
      if (entry?.kind === "tree") {
        next.add(path);
      }
      return next;
    });
  }

  function moveFocus(index: number) {
    setFocusIndex(index);
    itemRefs.current[index]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLUListElement>) {
    const row = rows[focusIndex];
    if (!row) {
      return;
    }
    let next = focusIndex;
    switch (event.key) {
      case "ArrowDown":
        next = Math.min(rows.length - 1, focusIndex + 1);
        break;
      case "ArrowUp":
        next = Math.max(0, focusIndex - 1);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = rows.length - 1;
        break;
      case "ArrowRight":
        if (row.entry.kind === "tree" && !row.expanded) {
          event.preventDefault();
          toggle(row.entry.path);
          return;
        }
        if (row.entry.kind === "tree" && row.expanded) {
          next = Math.min(rows.length - 1, focusIndex + 1);
        }
        break;
      case "ArrowLeft": {
        if (row.entry.kind === "tree" && row.expanded) {
          event.preventDefault();
          toggle(row.entry.path);
          return;
        }
        const parent = parentPath(row.entry.path);
        if (parent) {
          const parentIndex = findRowIndex(rows, parent);
          if (parentIndex >= 0) {
            next = parentIndex;
          }
        }
        break;
      }
      case "Enter":
      case " ":
        event.preventDefault();
        if (row.entry.kind === "blob") {
          onSelect(row.entry);
        } else {
          toggle(row.entry.path);
        }
        return;
      default:
        return;
    }
    event.preventDefault();
    if (next !== focusIndex) {
      moveFocus(next);
    }
  }

  const segments = selectedPath ? selectedPath.split("/") : [];

  return (
    <div className="filetree">
      <nav className="filetree__crumbs" aria-label="Selected file path">
        {segments.length === 0 ? (
          <span className="t-label filetree__crumbs-empty">[NO FILE SELECTED]</span>
        ) : (
          <ol className="filetree__crumbs-list">
            {segments.map((segment, index) => {
              const path = segments.slice(0, index + 1).join("/");
              return (
                <li key={path}>
                  {index > 0 ? (
                    <span className="filetree__sep" aria-hidden="true">
                      /
                    </span>
                  ) : null}
                  <button type="button" className="filetree__crumb" onClick={() => reveal(path)}>
                    {segment}
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </nav>
      <QueryFeedback pending={loading} error={error} onRetry={onRetry} />
      {!loading && !error && rows.length === 0 ? (
        <p className="t-label filetree__empty">[EMPTY TREE]</p>
      ) : null}
      {rows.length > 0 ? (
        <ul className="filetree__list" role="tree" aria-label="Repository files" onKeyDown={onKeyDown}>
          {rows.map((row, index) => {
            const isSelected = row.entry.path === selectedPath;
            const isBlob = row.entry.kind === "blob";
            const Icon = iconFor(row.entry, row.expanded);
            return (
              <li key={row.entry.path} role="none">
                <button
                  type="button"
                  role="treeitem"
                  aria-level={row.depth + 1}
                  aria-selected={isSelected}
                  aria-expanded={isBlob ? undefined : row.expanded}
                  tabIndex={index === focusIndex ? 0 : -1}
                  ref={(element) => {
                    itemRefs.current[index] = element;
                  }}
                  className="filetree__row"
                  data-selected={isSelected ? "true" : undefined}
                  onClick={() => {
                    setFocusIndex(index);
                    if (isBlob) {
                      onSelect(row.entry);
                    } else {
                      toggle(row.entry.path);
                    }
                  }}
                  onFocus={() => setFocusIndex(index)}
                >
                  <Icon size={iconSize.md} strokeWidth={iconStroke} aria-hidden="true" />
                  <span className="filetree__name">{row.entry.name}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
