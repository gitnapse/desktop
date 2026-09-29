import type { FileChange, GitStatus } from "../../../lib/types";

export type StatusGroupId = "conflicted" | "staged" | "unstaged" | "untracked";

export interface StatusEntry {
  path: string;
  kind: string;
  origPath: string | null;
  group: StatusGroupId;
}

export interface StatusGroup {
  id: StatusGroupId;
  label: string;
  entries: StatusEntry[];
}

const GROUP_LABELS: Record<StatusGroupId, string> = {
  conflicted: "Conflicted",
  staged: "Staged",
  unstaged: "Unstaged",
  untracked: "Untracked",
};

function fromChange(change: FileChange, group: StatusGroupId): StatusEntry {
  return {
    path: change.path,
    kind: change.kind,
    origPath: change.orig_path,
    group,
  };
}

export function groupStatus(status: GitStatus): StatusGroup[] {
  return [
    {
      id: "conflicted",
      label: GROUP_LABELS.conflicted,
      entries: status.conflicted.map((path) => ({
        path,
        kind: "conflicted",
        origPath: null,
        group: "conflicted" as const,
      })),
    },
    {
      id: "staged",
      label: GROUP_LABELS.staged,
      entries: status.staged.map((change) => fromChange(change, "staged")),
    },
    {
      id: "unstaged",
      label: GROUP_LABELS.unstaged,
      entries: status.unstaged.map((change) => fromChange(change, "unstaged")),
    },
    {
      id: "untracked",
      label: GROUP_LABELS.untracked,
      entries: status.untracked.map((path) => ({
        path,
        kind: "untracked",
        origPath: null,
        group: "untracked" as const,
      })),
    },
  ];
}

export function statusCounts(groups: readonly StatusGroup[]): Record<StatusGroupId, number> {
  return groups.reduce(
    (counts, group) => {
      counts[group.id] = group.entries.length;
      return counts;
    },
    { conflicted: 0, staged: 0, unstaged: 0, untracked: 0 },
  );
}

export function totalChanges(status: GitStatus): number {
  return (
    status.staged.length +
    status.unstaged.length +
    status.untracked.length +
    status.conflicted.length
  );
}

export function changeKindLabel(kind: string): string {
  switch (kind.toLowerCase()) {
    case "added":
    case "untracked":
      return "ADDED";
    case "modified":
      return "MODIFIED";
    case "deleted":
      return "DELETED";
    case "renamed":
      return "RENAMED";
    case "conflicted":
      return "CONFLICT";
    default:
      return kind.toUpperCase();
  }
}

export function changeKindTone(kind: string): "ok" | "warn" | "err" | "info" | "muted" {
  switch (kind.toLowerCase()) {
    case "added":
    case "untracked":
      return "ok";
    case "modified":
      return "warn";
    case "deleted":
    case "conflicted":
      return "err";
    case "renamed":
      return "info";
    default:
      return "muted";
  }
}

export interface DiffTarget {
  mode: "worktree" | "staged" | "commit" | "range";
  path?: string | null;
  rev?: string | null;
  from?: string | null;
  to?: string | null;
}

export function diffTargetKey(target: DiffTarget): string {
  switch (target.mode) {
    case "worktree":
      return `worktree:${target.path ?? ""}`;
    case "staged":
      return `staged:${target.path ?? ""}`;
    case "commit":
      return `commit:${target.rev ?? "HEAD"}`;
    case "range":
      return `range:${target.from ?? ""}..${target.to ?? ""}`;
  }
}

export function diffTargetLabel(target: DiffTarget): string {
  switch (target.mode) {
    case "worktree":
      return target.path ? `WORKTREE ${target.path}` : "WORKTREE";
    case "staged":
      return target.path ? `STAGED ${target.path}` : "STAGED";
    case "commit":
      return `COMMIT ${(target.rev ?? "HEAD").slice(0, 7)}`;
    case "range":
      return `RANGE ${target.from ?? "?"}..${target.to ?? "?"}`;
  }
}
