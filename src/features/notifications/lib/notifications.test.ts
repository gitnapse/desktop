import { describe, expect, it } from "vitest";
import type { NotificationDto } from "../../../lib/types";
import {
  filterNotifications,
  notificationReasonLabel,
  notificationReasonTone,
  notificationSubjectLabel,
  parseNotificationFilter,
  unreadCount,
} from "./notifications";

function fixture(overrides: Partial<NotificationDto>): NotificationDto {
  return {
    id: "n-x",
    unread: true,
    reason: "mention",
    subject_type: "Issue",
    subject_title: "Title",
    repo: "gitnapse/desktop",
    updated_at: "2026-09-28T08:00:00Z",
    html_url: null,
    ...overrides,
  };
}

describe("parseNotificationFilter", () => {
  it("defaults to all and accepts unread", () => {
    expect(parseNotificationFilter(null)).toBe("all");
    expect(parseNotificationFilter("unread")).toBe("unread");
    expect(parseNotificationFilter("other")).toBe("all");
  });
});

describe("unreadCount and filtering", () => {
  const items = [
    fixture({ id: "n-1", unread: true }),
    fixture({ id: "n-2", unread: false }),
    fixture({ id: "n-3", unread: true }),
  ];

  it("counts unread", () => {
    expect(unreadCount(items)).toBe(2);
    expect(unreadCount(undefined)).toBe(0);
  });

  it("filters unread without mutating the source", () => {
    expect(filterNotifications(items, "unread").map((item) => item.id)).toEqual(["n-1", "n-3"]);
    expect(filterNotifications(items, "all").length).toBe(3);
  });
});

describe("reason mapping", () => {
  it("labels known reasons and humanizes unknown ones", () => {
    expect(notificationReasonLabel("review_requested")).toBe("Review requested");
    expect(notificationReasonLabel("custom_event")).toBe("custom event");
  });

  it("maps reasons to semantic tones", () => {
    expect(notificationReasonTone("review_requested")).toBe("info");
    expect(notificationReasonTone("ci_activity")).toBe("ok");
    expect(notificationReasonTone("security_alert")).toBe("err");
    expect(notificationReasonTone("state_change")).toBe("warn");
    expect(notificationReasonTone("subscribed")).toBe("neutral");
  });

  it("labels subject types", () => {
    expect(notificationSubjectLabel("PullRequest")).toBe("Pull request");
    expect(notificationSubjectLabel("Custom")).toBe("Custom");
  });
});
