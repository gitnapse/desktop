import { describe, expect, it } from "vitest";
import type { TreeNodeDto } from "../../../lib/types";
import {
  ancestorPaths,
  buildTree,
  expandAncestors,
  findRowIndex,
  flattenTree,
  formatBytes,
  parentPath,
} from "./tree";

function node(path: string, kind: "blob" | "tree" = "blob"): TreeNodeDto {
  return {
    path,
    name: path.split("/").pop() ?? path,
    depth: path.split("/").length - 1,
    is_dir: kind === "tree",
  };
}

describe("buildTree", () => {
  it("nests flat nodes and sorts trees before blobs", () => {
    const roots = buildTree([
      node("src/styles/tokens.css"),
      node("README.md"),
      node("src"),
      node("src/app.ts"),
      node("assets"),
      node("assets/logo.png"),
    ]);
    expect(roots.map((entry) => entry.name)).toEqual(["assets", "src", "README.md"]);
    const src = roots.find((entry) => entry.name === "src");
    expect(src?.children.map((entry) => entry.name)).toEqual(["styles", "app.ts"]);
    const styles = src?.children.find((entry) => entry.name === "styles");
    expect(styles?.children[0]?.path).toBe("src/styles/tokens.css");
  });

  it("creates synthetic directories for files without explicit tree nodes", () => {
    const roots = buildTree([node("deep/nested/thing.ts")]);
    const deep = roots[0];
    expect(deep?.kind).toBe("tree");
    expect(deep?.path).toBe("deep");
    expect(deep?.children[0]?.path).toBe("deep/nested");
    expect(deep?.children[0]?.children[0]?.path).toBe("deep/nested/thing.ts");
  });

  it("ignores duplicate paths", () => {
    const roots = buildTree([node("a.txt"), node("a.txt")]);
    expect(roots).toHaveLength(1);
    expect(roots[0]?.children).toHaveLength(0);
  });
});

describe("flattenTree", () => {
  const roots = buildTree([
    node("src/app.ts"),
    node("src/lib/util.ts"),
    node("README.md"),
  ]);

  it("hides children of collapsed directories", () => {
    const rows = flattenTree(roots, new Set());
    expect(rows.map((row) => row.entry.path)).toEqual(["src", "README.md"]);
    expect(rows[0]?.expanded).toBe(false);
  });

  it("includes children with depth when expanded", () => {
    const rows = flattenTree(roots, new Set(["src"]));
    expect(rows.map((row) => [row.entry.path, row.depth])).toEqual([
      ["src", 0],
      ["src/lib", 1],
      ["src/app.ts", 1],
      ["README.md", 0],
    ]);
    expect(findRowIndex(rows, "src/app.ts")).toBe(2);
    expect(findRowIndex(rows, "missing")).toBe(-1);
    expect(flattenTree(roots, new Set(["src", "src/lib"])).map((row) => row.entry.path)).toContain(
      "src/lib/util.ts",
    );
  });
});

describe("path helpers", () => {
  it("computes parents and ancestors", () => {
    expect(parentPath("src/lib/util.ts")).toBe("src/lib");
    expect(parentPath("README.md")).toBeNull();
    expect(ancestorPaths("a/b/c.ts")).toEqual(["a", "a/b"]);
    expect(ancestorPaths("README.md")).toEqual([]);
  });

  it("expands ancestor sets without mutating the input", () => {
    const current = new Set<string>(["other"]);
    const next = expandAncestors("a/b/c.ts", current);
    expect([...next].sort()).toEqual(["a", "a/b", "other"]);
    expect(current.size).toBe(1);
  });

  it("formats byte sizes", () => {
    expect(formatBytes(null)).toBe("");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});
