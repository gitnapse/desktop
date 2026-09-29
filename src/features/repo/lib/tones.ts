import type { PrSummaryDto } from "../../../lib/types";

export type StatusTone = "ok" | "warn" | "err" | "info" | "muted";

export function statusTone(value: string | null | undefined): StatusTone {
  switch ((value ?? "").toLowerCase()) {
    case "open":
    case "success":
    case "succeeded":
    case "completed":
    case "approved":
      return "ok";
    case "queued":
    case "in_progress":
    case "pending":
    case "draft":
    case "neutral":
    case "skipped":
    case "cancelled":
    case "commented":
      return "warn";
    case "closed":
    case "failure":
    case "failed":
    case "error":
    case "timed_out":
    case "action_required":
    case "changes_requested":
      return "err";
    case "merged":
      return "info";
    default:
      return "muted";
  }
}

export function checkTone(status: string, conclusion: string | null): StatusTone {
  if (status === "completed") {
    return statusTone(conclusion ?? "muted");
  }
  return statusTone(status);
}

export function checkLabel(status: string, conclusion: string | null): string {
  if (status === "completed" && conclusion) {
    return conclusion.replace(/_/g, " ");
  }
  return status.replace(/_/g, " ");
}

export function issueTone(state: string): StatusTone {
  return state === "open" ? "ok" : "err";
}

/** PR state plus the optional `merged` flag from `PrDetailDto`. */
export type PullState = Pick<PrSummaryDto, "state"> & { merged?: boolean | null };

export function pullTone(pull: PullState): StatusTone {
  if (pull.merged === true) {
    return "info";
  }
  return pull.state === "open" ? "ok" : "err";
}

export function pullLabel(pull: PullState): string {
  if (pull.merged === true) {
    return "merged";
  }
  return pull.state === "open" ? "open" : "closed";
}

export function reviewTone(state: string): StatusTone {
  return statusTone(state);
}

export function fileKindTone(kind: string): StatusTone {
  switch (kind.toLowerCase()) {
    case "added":
    case "copied":
      return "ok";
    case "modified":
    case "changed":
      return "warn";
    case "removed":
    case "deleted":
      return "err";
    case "renamed":
    case "moved":
      return "info";
    default:
      return "muted";
  }
}

export function statusLabel(value: string): string {
  return value.replace(/_/g, " ").toUpperCase();
}
