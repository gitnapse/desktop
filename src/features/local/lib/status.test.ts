import { describe, expect, it } from "vitest";
import type { GitStatus } from "../../../lib/types";
import {
  changeKindLabel,
  changeKindTone,
  diffTargetKey,
  diffTargetLabel,
  groupStatus,
  statusCounts,
  totalChanges,
} from "./status";

const status: GitStatus = {
  branch: "feat/glass-shell",
  detached: false,
  ahead: 3,
  behind: 1,
  clean: false,
  staged: [
    { path: "src/styles/tokens.css", orig_path: null, kind: "modified", staged: true },
    { path: "src/new.ts", orig_path: null, kind: "added", staged: true },
  ],
  unstaged: [{ path: "src/lib/bridge.ts", orig_path: null, kind: "modified", staged: false }],
  untracked: ["notes.txt"],
  conflicted: ["merge.txt"],
};

describe("groupStatus", () => {
  it("orders groups conflict first and maps entries", () => {
    const groups = groupStatus(status);
    expect(groups.map((group) => group.id)).toEqual([
      "conflicted",
      "staged",
      "unstaged",
      "untracked",
    ]);
    expect(groups[0]?.entries[0]?.path).toBe("merge.txt");
    expect(groups[1]?.entries.map((entry) => entry.kind)).toEqual(["modified", "added"]);
    expect(groups[3]?.entries[0]?.path).toBe("notes.txt");
  });

  it("counts and totals entries", () => {
    const counts = statusCounts(groupStatus(status));
    expect(counts).toEqual({ conflicted: 1, staged: 2, unstaged: 1, untracked: 1 });
    expect(totalChanges(status)).toBe(5);
  });

  it("handles an empty clean status", () => {
    const clean: GitStatus = { ...status, staged: [], unstaged: [], untracked: [], conflicted: [] };
    expect(statusCounts(groupStatus(clean))).toEqual({
      conflicted: 0,
      staged: 0,
      unstaged: 0,
      untracked: 0,
    });
    expect(totalChanges(clean)).toBe(0);
  });
});

describe("change kind helpers", () => {
  it("labels and tones kinds", () => {
    expect(changeKindLabel("added")).toBe("ADDED");
    expect(changeKindLabel("weird")).toBe("WEIRD");
    expect(changeKindTone("added")).toBe("ok");
    expect(changeKindTone("modified")).toBe("warn");
    expect(changeKindTone("deleted")).toBe("err");
    expect(changeKindTone("renamed")).toBe("info");
  });
});

describe("diff targets", () => {
  it("serializes stable keys and labels", () => {
    expect(diffTargetKey({ mode: "worktree" })).toBe("worktree:");
    expect(diffTargetKey({ mode: "worktree", path: "a.ts" })).toBe("worktree:a.ts");
    expect(diffTargetKey({ mode: "commit", rev: "abc123" })).toBe("commit:abc123");
    expect(diffTargetKey({ mode: "range", from: "main", to: "dev" })).toBe("range:main..dev");
    expect(diffTargetLabel({ mode: "commit", rev: "abc123def" })).toBe("COMMIT abc123d");
    expect(diffTargetLabel({ mode: "staged" })).toBe("STAGED");
    expect(diffTargetLabel({ mode: "range", from: "main", to: "dev" })).toBe("RANGE main..dev");
  });
});
