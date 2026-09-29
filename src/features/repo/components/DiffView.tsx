import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { iconSize, iconStroke } from "../../../ui";
import type { DiffFileDto } from "../../../lib/types";
import { diffFromFiles, parseUnifiedDiff, summarizeDiff } from "../lib/diff";
import type { DiffFile, DiffHunk, DiffLine } from "../lib/diff";
import { EmptyPanel } from "./EmptyPanel";

export const MAX_DIFF_LINES_PER_FILE = 1500;

export interface DiffViewProps {
  diff?: string | null;
  files?: readonly DiffFileDto[] | null;
  emptyLabel?: string;
  className?: string;
}

function signFor(kind: DiffLine["kind"]): string {
  if (kind === "add") {
    return "+";
  }
  if (kind === "del") {
    return "-";
  }
  return " ";
}

interface HunkBlock {
  hunk: DiffHunk;
  lines: DiffLine[];
}

function buildBlocks(file: DiffFile): { blocks: HunkBlock[]; shown: number; total: number; truncated: boolean } {
  let remaining = MAX_DIFF_LINES_PER_FILE;
  const blocks: HunkBlock[] = [];
  const total = file.hunks.reduce((count, hunk) => count + hunk.lines.length, 0);
  let shown = 0;
  let truncated = false;

  for (const hunk of file.hunks) {
    if (remaining <= 0) {
      truncated = true;
      break;
    }
    const lines = hunk.lines.slice(0, remaining);
    remaining -= lines.length;
    shown += lines.length;
    blocks.push({ hunk, lines });
    if (lines.length < hunk.lines.length) {
      truncated = true;
      break;
    }
  }

  return { blocks, shown, total, truncated };
}

export function DiffView({
  diff = null,
  files = null,
  emptyLabel = "NO DIFF",
  className,
}: DiffViewProps) {
  const parsed = useMemo<DiffFile[]>(() => {
    if (diff && diff.trim().length > 0) {
      return parseUnifiedDiff(diff);
    }
    if (files) {
      return diffFromFiles(files);
    }
    return [];
  }, [diff, files]);

  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const summary = useMemo(() => summarizeDiff(parsed), [parsed]);

  if (parsed.length === 0) {
    return <EmptyPanel title={emptyLabel} className={className} />;
  }

  function toggle(key: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className={["diff", className].filter(Boolean).join(" ")}>
      {parsed.length > 1 ? (
        <p className="t-label diff__summary">
          <span>{`${summary.files} FILES`}</span>
          <span className="diff__add">{`+${summary.additions}`}</span>
          <span className="diff__del">{`-${summary.deletions}`}</span>
        </p>
      ) : null}
      {parsed.map((file, index) => {
        const key = `${file.path}:${index}`;
        const isCollapsed = collapsed.has(key);
        const { blocks, shown, total, truncated } = buildBlocks(file);
        return (
          <section className="diff__file" key={key}>
            <header className="diff__filehead">
              <button
                type="button"
                className="diff__toggle"
                aria-expanded={!isCollapsed}
                onClick={() => toggle(key)}
              >
                {isCollapsed ? (
                  <ChevronRight size={iconSize.md} strokeWidth={iconStroke} aria-hidden="true" />
                ) : (
                  <ChevronDown size={iconSize.md} strokeWidth={iconStroke} aria-hidden="true" />
                )}
                <span className="diff__path">{file.path.length > 0 ? file.path : "(unknown)"}</span>
              </button>
              <span className="diff__counts">
                <span className="diff__add" title={`${file.additions} additions`}>
                  {`+${file.additions}`}
                </span>
                <span className="diff__del" title={`${file.deletions} deletions`}>
                  {`-${file.deletions}`}
                </span>
              </span>
            </header>
            {!isCollapsed ? (
              file.binary ? (
                <p className="t-label diff__notice">[BINARY FILE]</p>
              ) : file.hunks.length === 0 ? (
                <p className="t-label diff__notice">[PATCH UNAVAILABLE]</p>
              ) : (
                <>
                  {blocks.map((block, blockIndex) => (
                    <div className="diff__hunk" key={`${block.hunk.header}:${blockIndex}`}>
                      <p className="diff__hunkhead">{block.hunk.header}</p>
                      <ol className="diff__lines">
                        {block.lines.map((line, lineIndex) => (
                          <li className="diff__line" data-kind={line.kind} key={lineIndex}>
                            <span className="diff__num">{line.oldNumber ?? ""}</span>
                            <span className="diff__num">{line.newNumber ?? ""}</span>
                            <span className="diff__text">
                              {line.kind === "meta" ? null : (
                                <span className="diff__sign" aria-hidden="true">
                                  {signFor(line.kind)}
                                </span>
                              )}
                              {line.text}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                  {truncated ? (
                    <p className="t-label diff__notice">
                      {`[TRUNCATED: SHOWING ${shown} OF ${total} LINES]`}
                    </p>
                  ) : null}
                </>
              )
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
