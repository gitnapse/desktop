import type { DiffTarget } from "./status";

export const localKeys = {
  info: (cwd: string) => ["git-repo-info", cwd] as const,
  status: (cwd: string) => ["git-status", cwd] as const,
  log: (cwd: string) => ["git-log", cwd] as const,
  branches: (cwd: string) => ["git-branches", cwd] as const,
  tags: (cwd: string) => ["git-tags", cwd] as const,
  stash: (cwd: string) => ["git-stash", cwd] as const,
  remotes: (cwd: string) => ["git-remotes", cwd] as const,
  diff: (cwd: string, target: DiffTarget) =>
    ["git-diff", cwd, target.mode, target.path ?? "", target.rev ?? "", target.from ?? "", target.to ?? ""] as const,
};
