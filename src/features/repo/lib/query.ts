export type IssueStateFilter = "open" | "closed" | "all";
export type PullStateFilter = "open" | "closed" | "all";
export type PullView = "conversation" | "files" | "commits" | "reviews";

export interface RepoQueryInput {
  ref?: string | null;
  path?: string | null;
  number?: number | null;
  state?: string | null;
  view?: string | null;
  base?: string | null;
  head?: string | null;
  branch?: string | null;
  isNew?: boolean | null;
}

export function parseIssueState(value: string | null | undefined): IssueStateFilter {
  if (value === "closed" || value === "all") {
    return value;
  }
  return "open";
}

export function parsePullState(value: string | null | undefined): PullStateFilter {
  if (value === "closed" || value === "all") {
    return value;
  }
  return "open";
}

export function parsePullView(value: string | null | undefined): PullView {
  if (value === "files" || value === "commits" || value === "reviews") {
    return value;
  }
  return "conversation";
}

export function parseNumberParam(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.trim().length === 0) {
    return null;
  }
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseRefParam(value: string | null | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
}

function applyUpdate(params: URLSearchParams, key: string, value: string | null): void {
  if (value === null || value.length === 0) {
    params.delete(key);
    return;
  }
  params.set(key, value);
}

export function mergeRepoQuery(
  current: URLSearchParams,
  updates: RepoQueryInput,
): URLSearchParams {
  const params = new URLSearchParams(current);
  if (updates.ref !== undefined) {
    applyUpdate(params, "ref", updates.ref);
  }
  if (updates.path !== undefined) {
    applyUpdate(params, "path", updates.path);
  }
  if (updates.number !== undefined) {
    applyUpdate(params, "number", updates.number === null ? null : String(updates.number));
  }
  if (updates.state !== undefined) {
    applyUpdate(params, "state", updates.state);
  }
  if (updates.view !== undefined) {
    applyUpdate(params, "view", updates.view);
  }
  if (updates.base !== undefined) {
    applyUpdate(params, "base", updates.base);
  }
  if (updates.head !== undefined) {
    applyUpdate(params, "head", updates.head);
  }
  if (updates.branch !== undefined) {
    applyUpdate(params, "branch", updates.branch);
  }
  if (updates.isNew !== undefined) {
    applyUpdate(params, "new", updates.isNew ? "1" : null);
  }
  return params;
}

export function buildRepoQuery(input: RepoQueryInput): string {
  const params = mergeRepoQuery(new URLSearchParams(), input);
  const text = params.toString();
  return text.length > 0 ? `?${text}` : "";
}

export function refOnlySearch(current: URLSearchParams): string {
  const ref = parseRefParam(current.get("ref"));
  return ref ? `?ref=${encodeURIComponent(ref)}` : "";
}
