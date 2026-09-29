import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import type {
  ActorDto,
  ContentDto,
  DiffFileDto,
  IssueDto,
  PrSummaryDto,
  ReleaseDto,
  TreeNodeDto,
} from "../../../lib/types";
import { DiffView } from "../components/DiffView";
import { FileTree } from "../components/FileTree";
import { CommitRow } from "../components/CommitRow";
import { IssueRow } from "../components/IssueRow";
import { PrRow } from "../components/PrRow";
import { ReleaseCard } from "../components/ReleaseCard";
import { StatusDot } from "../components/StatusDot";
import { LabelChip } from "../components/LabelChip";
import { CodeView } from "../components/CodeView";
import { commitToRow } from "../lib/commit";

const patch = [
  "diff --git a/src/app.ts b/src/app.ts",
  "--- a/src/app.ts",
  "+++ b/src/app.ts",
  "@@ -1,3 +1,4 @@",
  " const a = 1;",
  "-const b = 2;",
  "+const b = 3;",
  "+const c = 4;",
].join("\n");

function base64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

const user: ActorDto = { login: "xscriptor", avatar_url: null };

const file: DiffFileDto = {
  filename: "src/app.ts",
  status: "modified",
  additions: 2,
  deletions: 1,
  changes: 3,
  patch,
};

const nodes: TreeNodeDto[] = [
  { path: "src", name: "src", depth: 0, is_dir: true },
  { path: "src/app.ts", name: "app.ts", depth: 1, is_dir: false },
  { path: "README.md", name: "README.md", depth: 0, is_dir: false },
];

const issue: IssueDto = {
  number: 142,
  title: "Glass levels",
  state: "open",
  body: "Body",
  user,
  labels: [{ name: "docs", color: "ff0000" }],
  created_at: "2026-09-18T09:30:00Z",
  updated_at: "2026-09-27T16:12:00Z",
  html_url: "https://github.com/x/y/issues/142",
  is_pr: false,
};

const pull: PrSummaryDto = {
  number: 88,
  title: "Glass design system",
  state: "open",
  html_url: "https://github.com/x/y/pull/88",
  user,
  body: null,
  created_at: "2026-09-20T10:15:00Z",
  updated_at: "2026-09-28T08:45:00Z",
  additions: 40,
  deletions: 12,
  changed_files: 3,
};

const release: ReleaseDto = {
  tag_name: "v0.1.0",
  name: "Preview",
  body: "# Notes",
  html_url: "https://github.com/x/y/releases/tag/v0.1.0",
  created_at: "2026-09-12T10:00:00Z",
  published_at: "2026-09-12T10:00:00Z",
  prerelease: true,
};

const content: ContentDto = {
  path: "src/app.ts",
  content: base64("const answer = 42;\nfunction main() {\n  return answer;\n}\n"),
  size: 55,
};

describe("feature component renders", () => {
  it("renders diff, tree, rows and code view with data", () => {
    const html = renderToString(
      createElement(
        MemoryRouter,
        null,
        createElement(
          "div",
          null,
          createElement(DiffView, { files: [file] }),
          createElement(DiffView, { diff: patch }),
          createElement(FileTree, { nodes, selectedPath: "src/app.ts", onSelect: () => undefined }),
          createElement(
            "ul",
            null,
            createElement(CommitRow, {
              commit: commitToRow({
                sha: "a".repeat(40),
                message: "Subject\n\nBody",
                author_name: "Ada",
                author_date: "2026-09-28T16:42:00Z",
                author: { login: "ada-lovelace", avatar_url: null },
              }),
              avatar: true,
              repoFullName: "x/y",
              compareFrom: "main",
            }),
            createElement(IssueRow, { issue, to: "?number=142" }),
            createElement(PrRow, { pull, to: "?number=88" }),
          ),
          createElement(ReleaseCard, { release, defaultOpen: true }),
          createElement(StatusDot, { tone: "ok", label: "open" }),
          createElement(LabelChip, { label: { name: "docs", color: "d0ff00" } }),
          createElement(CodeView, {
            content,
            path: "src/app.ts",
            repoFullName: "x/y",
            refName: "main",
          }),
        ),
      ),
    );
    expect(html).toContain("src/app.ts");
    expect(html).toContain("Glass design system");
    expect(html).toContain("v0.1.0");
  });
});
