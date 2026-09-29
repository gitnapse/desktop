import { describe, expect, it } from "vitest";
import type { DiffFileDto } from "../../../lib/types";
import { diffFromFiles, parseUnifiedDiff, summarizeDiff } from "./diff";

const twoFilePatch = [
  "diff --git a/src/app.ts b/src/app.ts",
  "index 1111111..2222222 100644",
  "--- a/src/app.ts",
  "+++ b/src/app.ts",
  "@@ -1,4 +1,5 @@ export function main() {",
  " const value = 1;",
  "-const old = true;",
  "+const next = true;",
  "+const extra = 2;",
  " return value;",
  "}",
  "diff --git a/README.md b/README.md",
  "new file mode 100644",
  "index 0000000..3333333",
  "--- /dev/null",
  "+++ b/README.md",
  "@@ -0,0 +1,2 @@",
  "+# Title",
  "+",
].join("\n");

describe("parseUnifiedDiff", () => {
  it("parses multiple files with hunks and counters", () => {
    const files = parseUnifiedDiff(twoFilePatch);
    expect(files).toHaveLength(2);

    const first = files[0];
    expect(first?.path).toBe("src/app.ts");
    expect(first?.additions).toBe(2);
    expect(first?.deletions).toBe(1);
    expect(first?.hunks).toHaveLength(1);

    const hunk = first?.hunks[0];
    expect(hunk?.oldStart).toBe(1);
    expect(hunk?.newStart).toBe(1);
    expect(hunk?.lines.map((line) => line.kind)).toEqual([
      "context",
      "del",
      "add",
      "add",
      "context",
      "context",
    ]);
    expect(hunk?.lines[1]).toMatchObject({ oldNumber: 2, newNumber: null });
    expect(hunk?.lines[2]).toMatchObject({ oldNumber: null, newNumber: 2 });

    const second = files[1];
    expect(second?.oldPath).toBeNull();
    expect(second?.path).toBe("README.md");
    expect(second?.meta.some((line) => line.includes("new file mode"))).toBe(true);
  });

  it("numbers context, additions and deletions across hunks", () => {
    const patch = [
      "diff --git a/a.txt b/a.txt",
      "--- a/a.txt",
      "+++ b/a.txt",
      "@@ -10,3 +10,4 @@",
      " ten",
      "-eleven",
      "+eleven changed",
      "+eleven and a half",
      " twelve",
      "@@ -20,1 +21,1 @@",
      "-twenty",
      "+twenty one",
    ].join("\n");
    const file = parseUnifiedDiff(patch)[0];
    expect(file?.additions).toBe(3);
    expect(file?.deletions).toBe(2);
    const firstHunk = file?.hunks[0];
    expect(firstHunk?.lines[0]).toMatchObject({ oldNumber: 10, newNumber: 10 });
    expect(firstHunk?.lines[1]).toMatchObject({ oldNumber: 11, newNumber: null });
    expect(firstHunk?.lines[4]).toMatchObject({ oldNumber: 12, newNumber: 13 });
    const secondHunk = file?.hunks[1];
    expect(secondHunk?.lines[0]).toMatchObject({ oldNumber: 20, newNumber: null });
    expect(secondHunk?.lines[1]).toMatchObject({ oldNumber: null, newNumber: 21 });
  });

  it("detects binary markers and rename metadata", () => {
    const patch = [
      "diff --git a/old.png b/new.png",
      "similarity index 100%",
      "rename from old.png",
      "rename to new.png",
      "Binary files a/old.png and b/new.png differ",
    ].join("\n");
    const file = parseUnifiedDiff(patch)[0];
    expect(file?.binary).toBe(true);
    expect(file?.path).toBe("new.png");
    expect(file?.meta).toContain("rename from old.png");
  });

  it("keeps the no-newline marker as meta inside a hunk", () => {
    const patch = [
      "diff --git a/a.txt b/a.txt",
      "--- a/a.txt",
      "+++ b/a.txt",
      "@@ -1 +1 @@",
      "-old",
      "\\ No newline at end of file",
      "+new",
      "\\ No newline at end of file",
    ].join("\n");
    const hunk = parseUnifiedDiff(patch)[0]?.hunks[0];
    expect(hunk?.lines.map((line) => line.kind)).toEqual(["del", "meta", "add", "meta"]);
  });

  it("returns nothing for empty input", () => {
    expect(parseUnifiedDiff("")).toEqual([]);
    expect(parseUnifiedDiff("   \n")).toEqual([]);
  });
});

describe("diffFromFiles", () => {
  const files: DiffFileDto[] = [
    { filename: "src/app.ts", status: "modified", additions: 4, deletions: 2, changes: 6, patch: twoFilePatch.split("diff --git a/README.md b/README.md")[0] ?? null },
    { filename: "assets/logo.png", status: "modified", additions: 0, deletions: 0, changes: 0, patch: null },
  ];

  it("parses patches and falls back to dto counters", () => {
    const parsed = diffFromFiles(files);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.hunks.length).toBeGreaterThan(0);
    expect(parsed[1]?.patchAvailable).toBe(false);
    expect(parsed[1]?.path).toBe("assets/logo.png");
  });

  it("summarizes totals", () => {
    const total = summarizeDiff(diffFromFiles(files));
    expect(total.files).toBe(2);
    expect(total.additions).toBeGreaterThan(0);
  });
});
