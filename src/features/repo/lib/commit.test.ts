import { describe, expect, it } from "vitest";
import { splitCommitMessage, commitToRow, logEntryToRow } from "./commit";

describe("splitCommitMessage", () => {
  it("splits subject and body", () => {
    expect(splitCommitMessage("subject only")).toEqual({ subject: "subject only", body: "" });
    expect(splitCommitMessage("subject\n\nbody line\nmore")).toEqual({
      subject: "subject",
      body: "body line\nmore",
    });
    expect(splitCommitMessage("subject\nbody")).toEqual({ subject: "subject", body: "body" });
  });
});

describe("row conversion", () => {
  it("maps commit DTOs", () => {
    const row = commitToRow({
      sha: "4f1c9a7d2e8b6c3f0a1d4e7b9c2f5a8d1e4b7c0f",
      message: "Add glass token contract\n\nDetails here.",
      author_name: "Xscriptor",
      author_date: "2026-09-28T16:42:00Z",
      author: { login: "xscriptor", avatar_url: null },
    });
    expect(row.shortSha).toBe("4f1c9a7");
    expect(row.subject).toBe("Add glass token contract");
    expect(row.body).toBe("Details here.");
    expect(row.date).toBe("2026-09-28T16:42:00Z");
  });

  it("maps local log entries", () => {
    const row = logEntryToRow({
      hash: "a".repeat(40),
      short: "aaaaaaa",
      author_name: "Ada",
      author_email: "ada@example.com",
      date: "2026-09-27T11:20:00Z",
      subject: "Freeze sidecar lifecycle states",
    });
    expect(row.sha).toHaveLength(40);
    expect(row.shortSha).toBe("aaaaaaa");
    expect(row.subject).toBe("Freeze sidecar lifecycle states");
  });
});
