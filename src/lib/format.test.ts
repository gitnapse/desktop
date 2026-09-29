import { describe, expect, it } from "vitest";
import {
  authSourceLabel,
  eventDescription,
  eventKindLabel,
  externalUrl,
  formatAbsoluteTime,
  formatCount,
  formatRelativeTime,
  repoPath,
} from "./format";

const now = "2026-09-29T12:00:00Z";

describe("formatRelativeTime", () => {
  it("formats compact units", () => {
    expect(formatRelativeTime("2026-09-29T11:57:00Z", now, "en")).toBe("3m");
    expect(formatRelativeTime("2026-09-29T10:00:00Z", now, "en")).toBe("2h");
    expect(formatRelativeTime("2026-09-24T12:00:00Z", now, "en")).toBe("5d");
    expect(formatRelativeTime("2026-09-15T12:00:00Z", now, "en")).toBe("2w");
    expect(formatRelativeTime("2025-09-29T12:00:00Z", now, "en")).toBe("1y");
  });

  it("collapses sub-minute values to now", () => {
    expect(formatRelativeTime("2026-09-29T11:59:40Z", now, "en")).toBe("now");
    expect(formatRelativeTime(now, now, "en")).toBe("now");
  });

  it("marks future values with a plus prefix", () => {
    expect(formatRelativeTime("2026-09-29T12:03:00Z", now, "en")).toBe("+3m");
  });

  it("returns an em dash for invalid input", () => {
    expect(formatRelativeTime("not-a-date", now, "en")).toBe("—");
  });
});

describe("formatAbsoluteTime", () => {
  it("produces an ISO value and a locale label", () => {
    const result = formatAbsoluteTime("2026-09-29T12:00:00Z", "en-US");
    expect(result?.iso).toBe("2026-09-29T12:00:00.000Z");
    expect(result?.label.length).toBeGreaterThan(0);
  });

  it("rejects invalid input", () => {
    expect(formatAbsoluteTime("nope")).toBeNull();
  });
});

describe("formatCount", () => {
  it("uses locale compact notation", () => {
    expect(formatCount(1284, "en")).toBe("1.3K");
    expect(formatCount(950, "en")).toBe("950");
  });
});

describe("authSourceLabel", () => {
  it("labels known and unknown sources", () => {
    expect(authSourceLabel("oauth")).toBe("OAUTH");
    expect(authSourceLabel("stored")).toBe("STORED");
    expect(authSourceLabel(null)).toBe("NONE");
    expect(authSourceLabel("magic")).toBe("MAGIC");
  });
});

describe("event labels", () => {
  it("labels protocol event kinds", () => {
    expect(eventKindLabel("push")).toBe("PUSH");
    expect(eventKindLabel("pull_request")).toBe("PULL REQUEST");
    expect(eventKindLabel("release")).toBe("RELEASE");
  });

  it("prefers the title and falls back to kind and repo", () => {
    expect(eventDescription({ kind: "push", title: "Pushed 3 commits", repo: "a/b" })).toBe(
      "Pushed 3 commits",
    );
    expect(eventDescription({ kind: "release", title: "  ", repo: "a/b" })).toBe("RELEASE in a/b");
    expect(eventDescription({ kind: "watch", title: null, repo: "" })).toBe("WATCH");
  });
});

describe("path helpers", () => {
  it("builds repo routes", () => {
    expect(repoPath({ owner: "gitnapse", name: "desktop" })).toBe("/repos/gitnapse/desktop");
  });

  it("normalizes external urls", () => {
    expect(externalUrl("xscriptor.com")).toBe("https://xscriptor.com");
    expect(externalUrl("http://example.com/a")).toBe("http://example.com/a");
    expect(externalUrl("  https://example.com  ")).toBe("https://example.com");
  });
});
