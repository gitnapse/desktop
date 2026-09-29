import type { DiffFileDto } from "../../../lib/types";

export type DiffLineKind = "add" | "del" | "context" | "meta";

export interface DiffLine {
  kind: DiffLineKind;
  text: string;
  oldNumber: number | null;
  newNumber: number | null;
}

export interface DiffHunk {
  header: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

export interface DiffFile {
  oldPath: string | null;
  newPath: string | null;
  path: string;
  additions: number;
  deletions: number;
  binary: boolean;
  meta: string[];
  hunks: DiffHunk[];
  patchAvailable: boolean;
}

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;
const DIFF_HEADER = /^diff --git a\/(.*?) b\/(.*)$/;

function unquote(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length > 1) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function stripPrefix(value: string): string | null {
  const path = unquote(value);
  if (path === "/dev/null" || path.length === 0) {
    return null;
  }
  return path.startsWith("a/") || path.startsWith("b/") ? path.slice(2) : path;
}

function newDiffFile(): DiffFile {
  return {
    oldPath: null,
    newPath: null,
    path: "",
    additions: 0,
    deletions: 0,
    binary: false,
    meta: [],
    hunks: [],
    patchAvailable: true,
  };
}

function parseHeaderPaths(line: string): { oldPath: string | null; newPath: string | null } {
  const match = DIFF_HEADER.exec(line);
  if (match) {
    return { oldPath: unquote(match[1] ?? ""), newPath: unquote(match[2] ?? "") };
  }
  const tokens = line.split(" ");
  const oldToken = tokens[tokens.length - 2];
  const newToken = tokens[tokens.length - 1];
  return {
    oldPath: oldToken ? stripPrefix(oldToken) : null,
    newPath: newToken ? stripPrefix(newToken) : null,
  };
}

export function parseUnifiedDiff(source: string): DiffFile[] {
  const files: DiffFile[] = [];
  if (source.trim().length === 0) {
    return files;
  }

  let current: DiffFile | null = null;
  let hunk: DiffHunk | null = null;
  let oldNumber = 0;
  let newNumber = 0;

  for (const raw of source.split(/\r?\n/)) {
    if (raw.startsWith("diff --git ")) {
      const paths = parseHeaderPaths(raw);
      current = newDiffFile();
      current.oldPath = paths.oldPath;
      current.newPath = paths.newPath;
      files.push(current);
      hunk = null;
      continue;
    }

    if (!current) {
      if (raw.startsWith("@@") || raw.startsWith("--- ") || raw.startsWith("+++ ")) {
        current = newDiffFile();
        files.push(current);
      } else {
        continue;
      }
    }

    if (raw.startsWith("@@")) {
      const match = HUNK_HEADER.exec(raw);
      const parsed: DiffHunk = {
        header: raw,
        oldStart: match ? Number(match[1]) : 0,
        oldLines: match?.[2] ? Number(match[2]) : 0,
        newStart: match ? Number(match[3]) : 0,
        newLines: match?.[4] ? Number(match[4]) : 0,
        lines: [],
      };
      current.hunks.push(parsed);
      hunk = parsed;
      oldNumber = parsed.oldStart;
      newNumber = parsed.newStart;
      continue;
    }

    if (raw.startsWith("--- ")) {
      current.oldPath = stripPrefix(raw.slice(4));
      continue;
    }

    if (raw.startsWith("+++ ")) {
      current.newPath = stripPrefix(raw.slice(4));
      continue;
    }

    if (raw.startsWith("Binary files ") || raw.startsWith("GIT binary patch")) {
      current.binary = true;
      hunk = null;
      continue;
    }

    if (hunk) {
      if (raw.startsWith("+")) {
        hunk.lines.push({ kind: "add", text: raw.slice(1), oldNumber: null, newNumber });
        newNumber += 1;
        current.additions += 1;
        continue;
      }
      if (raw.startsWith("-")) {
        hunk.lines.push({ kind: "del", text: raw.slice(1), oldNumber, newNumber: null });
        oldNumber += 1;
        current.deletions += 1;
        continue;
      }
      if (raw.startsWith("\\")) {
        hunk.lines.push({ kind: "meta", text: raw, oldNumber: null, newNumber: null });
        continue;
      }
      const text = raw.startsWith(" ") ? raw.slice(1) : raw;
      hunk.lines.push({ kind: "context", text, oldNumber, newNumber });
      oldNumber += 1;
      newNumber += 1;
      continue;
    }

    if (raw.length === 0) {
      continue;
    }
    current.meta.push(raw);
  }

  for (const file of files) {
    file.path = file.newPath ?? file.oldPath ?? "";
  }
  return files;
}

export function diffFromFiles(files: readonly DiffFileDto[]): DiffFile[] {
  return files.map((file) => {
    if (file.patch) {
      const parsed = parseUnifiedDiff(file.patch);
      const first = parsed[0];
      if (first) {
        return { ...first, path: first.path.length > 0 ? first.path : file.filename };
      }
    }
    return {
      oldPath: null,
      newPath: file.filename,
      path: file.filename,
      additions: file.additions,
      deletions: file.deletions,
      binary: false,
      meta: [],
      hunks: [],
      patchAvailable: false,
    };
  });
}

export function summarizeDiff(files: readonly DiffFile[]): {
  files: number;
  additions: number;
  deletions: number;
} {
  return files.reduce(
    (total, file) => ({
      files: total.files + 1,
      additions: total.additions + file.additions,
      deletions: total.deletions + file.deletions,
    }),
    { files: 0, additions: 0, deletions: 0 },
  );
}
