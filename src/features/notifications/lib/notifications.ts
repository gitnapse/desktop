import type { NotificationDto } from "../../../lib/types";

export const notificationsQueryKey = ["notifications"] as const;

export const NOTIFICATIONS_PAGE_SIZE = 50;

export type NotificationFilter = "all" | "unread";

export const notificationFilters: ReadonlyArray<{ value: NotificationFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
];

export function parseNotificationFilter(value: string | null | undefined): NotificationFilter {
  return value === "unread" ? "unread" : "all";
}

export function filterNotifications(
  items: readonly NotificationDto[],
  filter: NotificationFilter,
): NotificationDto[] {
  return filter === "unread" ? items.filter((item) => item.unread) : [...items];
}

export function unreadCount(items: readonly NotificationDto[] | undefined): number {
  if (!items) {
    return 0;
  }
  return items.reduce((count, item) => (item.unread ? count + 1 : count), 0);
}

export type NotificationTone = "neutral" | "ok" | "warn" | "err" | "info";

const reasonLabels: Record<string, string> = {
  assign: "Assigned",
  author: "Your thread",
  ci_activity: "CI activity",
  comment: "New comment",
  invitation: "Invitation",
  manual: "Subscribed",
  mention: "Mentioned",
  review_requested: "Review requested",
  security_alert: "Security alert",
  state_change: "State changed",
  subscribed: "Watching",
  team_mention: "Team mentioned",
};

export function notificationReasonLabel(reason: string): string {
  return reasonLabels[reason] ?? reason.replace(/_/g, " ");
}

export function notificationReasonTone(reason: string): NotificationTone {
  if (reason === "review_requested" || reason === "assign" || reason === "mention") {
    return "info";
  }
  if (reason === "state_change" || reason === "team_mention") {
    return "warn";
  }
  if (reason === "security_alert") {
    return "err";
  }
  if (reason === "ci_activity") {
    return "ok";
  }
  return "neutral";
}

const subjectLabels: Record<string, string> = {
  CheckSuite: "Check suite",
  Commit: "Commit",
  Discussion: "Discussion",
  Issue: "Issue",
  PullRequest: "Pull request",
  Release: "Release",
  RepositoryVulnerabilityAlert: "Vulnerability alert",
};

export function notificationSubjectLabel(type: string): string {
  return subjectLabels[type] ?? type;
}
