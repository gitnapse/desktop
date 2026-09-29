import { describe, expect, it } from "vitest";
import { createElement, type ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { mockInvoke } from "../../../lib/mock";
import RepoPage from "../../../app/pages/RepoPage";
import LocalPage from "../../../app/pages/LocalPage";
import OverviewTab from "../../../app/pages/repo/OverviewTab";
import CodeTab from "../../../app/pages/repo/CodeTab";
import CommitsTab from "../../../app/pages/repo/CommitsTab";
import BranchesTab from "../../../app/pages/repo/BranchesTab";
import CompareTab from "../../../app/pages/repo/CompareTab";
import IssuesTab from "../../../app/pages/repo/IssuesTab";
import PullsTab from "../../../app/pages/repo/PullsTab";
import ActionsTab from "../../../app/pages/repo/ActionsTab";
import ReleasesTab from "../../../app/pages/repo/ReleasesTab";
import { PullDetail } from "../components/PullDetail";
import { localKeys } from "../../local/lib/keys";

const repo = "gitnapse/desktop";

async function seedTab(client: QueryClient, tab: string) {
  const fullName = repo;
  client.setQueryData(["repo", fullName], await mockInvoke("repo_detail", { repo: fullName }));
  client.setQueryData(["repo-branches", fullName], await mockInvoke("branches", { repo: fullName }));
  client.setQueryData(["clone-dir"], "/mock/projects");
  client.setQueryData(
    ["git-repo-info", `/mock/projects/${fullName}`],
    await mockInvoke("git_repo_info", { cwd: "/mock" }),
  );
  if (tab === "overview") {
    const content = await mockInvoke("file_content", { repo: fullName, path: "README.md" });
    client.setQueryData(["repo-readme", fullName, null], {
      path: "README.md",
      content,
      text: "# gitnapse",
    });
    client.setQueryData(["repo-languages", fullName], await mockInvoke("repo_languages", { repo: fullName }));
    client.setQueryData(["repo-contributors", fullName], await mockInvoke("repo_contributors", { repo: fullName }));
    client.setQueryData(["repo-commits", fullName, null, 5], await mockInvoke("recent_commits", { repo: fullName, perPage: 5 }));
    client.setQueryData(["releases", fullName, 1], await mockInvoke("releases", { repo: fullName, perPage: 1 }));
  }
  if (tab === "code") {
    client.setQueryData(["repo-tree", fullName, "main"], await mockInvoke("repo_tree", { repo: fullName }));
    client.setQueryData(
      ["file", fullName, "main", "README.md"],
      await mockInvoke("file_content", { repo: fullName, path: "README.md" }),
    );
  }
  if (tab === "commits") {
    client.setQueryData(["repo-commits", fullName, null, 30], await mockInvoke("recent_commits", { repo: fullName, perPage: 30 }));
  }
  if (tab === "compare") {
    client.setQueryData(
      ["compare", fullName, "main", "feat/glass-shell"],
      await mockInvoke("compare_branches", { repo: fullName, base: "main", head: "feat/glass-shell" }),
    );
  }
  if (tab === "issues") {
    client.setQueryData(["issues", fullName, "open"], await mockInvoke("issues", { repo: fullName, state: "open" }));
    client.setQueryData(["issue", fullName, 142], await mockInvoke("issue", { repo: fullName, number: 142 }));
    client.setQueryData(["issue-comments", fullName, 142], await mockInvoke("issue_comments", { repo: fullName, number: 142 }));
  }
  if (tab === "pulls") {
    client.setQueryData(["pulls", fullName, "open"], await mockInvoke("pull_requests", { repo: fullName, state: "open" }));
    client.setQueryData(["pull", fullName, 88], await mockInvoke("pull_request", { repo: fullName, number: 88 }));
    client.setQueryData(["pr-conversation", fullName, 88], await mockInvoke("pr_conversation", { repo: fullName, number: 88 }));
    client.setQueryData(["pr-files", fullName, 88], await mockInvoke("pr_files", { repo: fullName, number: 88 }));
    client.setQueryData(["pr-commits", fullName, 88], await mockInvoke("pull_request_commits", { repo: fullName, number: 88 }));
    client.setQueryData(["pr-reviews", fullName, 88], await mockInvoke("pull_request_reviews", { repo: fullName, number: 88 }));
  }
  if (tab === "actions") {
    client.setQueryData(["check-runs", fullName, "main"], await mockInvoke("check_runs", { repo: fullName, gitRef: "main" }));
    client.setQueryData(["workflow-runs", fullName, ""], await mockInvoke("workflow_runs", { repo: fullName }));
  }
  if (tab === "releases") {
    client.setQueryData(["releases", fullName], await mockInvoke("releases", { repo: fullName, perPage: 30 }));
  }
}

const tabs: Array<[string, ComponentType, string]> = [
  ["overview", OverviewTab, "Rust"],
  ["code", CodeTab, "README.md"],
  ["commits", CommitsTab, "Add glass token contract"],
  ["branches", BranchesTab, "feat/glass-shell"],
  ["compare", CompareTab, "src/styles/tokens.css"],
  ["issues", IssuesTab, "Glass levels"],
  ["pulls", PullsTab, "Glass design system"],
  ["actions", ActionsTab, "cargo test -p gitnapse-bridge"],
  ["releases", ReleasesTab, "v0.1.0"],
];

describe("pages with seeded data", () => {
  it("renders every repo tab from cache", async () => {
    for (const [tab, Component, expected] of tabs) {
      const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
      await seedTab(client, tab);
      const router = createMemoryRouter(
        [
          {
            path: "/repos/:owner/:name",
            element: createElement(RepoPage),
            children: [{ path: ":tab", element: createElement(Component) }],
          },
        ],
        { initialEntries: [`/repos/gitnapse/desktop/${tab}`] },
      );
      const html = renderToString(
        createElement(QueryClientProvider, { client }, createElement(RouterProvider, { router })),
      );
      expect(html.length).toBeGreaterThan(0);
      expect(html, `tab ${tab}`).toContain(expected);
    }
  });

  it("renders the pull request conversation from IssueCommentDto[]", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(["pull", repo, 88], await mockInvoke("pull_request", { repo, number: 88 }));
    client.setQueryData(["pr-conversation", repo, 88], await mockInvoke("pr_conversation", { repo, number: 88 }));
    client.setQueryData(["pr-comments", repo, 88], await mockInvoke("pull_request_comments", { repo, number: 88 }));
    client.setQueryData(["pr-reviews", repo, 88], await mockInvoke("pull_request_reviews", { repo, number: 88 }));
    const html = renderToString(
      createElement(QueryClientProvider, { client }, createElement(PullDetail, {
        repo,
        number: 88,
        view: "conversation",
        onViewChange: () => undefined,
        onClose: () => undefined,
        onMerge: () => undefined,
      })),
    );
    // Reviews, issue comments and inline comments merge into one timeline.
    expect(html).toContain("APPROVED");
    expect(html).toContain("CHANGES REQUESTED");
    expect(html).toContain("commented");
    expect(html).toContain("src/styles/glass.css:42");
    expect((html.match(/thread__item/g) ?? []).length).toBe(4);
  });

  it("renders the local page from cache", async () => {
    const cwd = "/mock/projects/gitnapse/desktop";
    const store = new Map<string, string>();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => {
          store.set(key, value);
        },
        removeItem: (key: string) => {
          store.delete(key);
        },
      },
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    client.setQueryData(localKeys.info(cwd), await mockInvoke("git_repo_info", { cwd }));
    client.setQueryData(localKeys.status(cwd), await mockInvoke("git_status", { cwd }));
    client.setQueryData(localKeys.branches(cwd), await mockInvoke("git_branches", { cwd }));
    client.setQueryData(localKeys.tags(cwd), await mockInvoke("git_tags", { cwd }));
    client.setQueryData(localKeys.stash(cwd), await mockInvoke("git_stash_list", { cwd }));
    client.setQueryData(localKeys.remotes(cwd), await mockInvoke("git_remotes", { cwd }));
    client.setQueryData([...localKeys.log(cwd), 20], await mockInvoke("git_log", { cwd, limit: 20 }));
    client.setQueryData(localKeys.diff(cwd, { mode: "worktree" }), await mockInvoke("git_diff", { cwd, mode: { kind: "worktree" } }));
    localStorage.setItem("gitnapse.local.cwd", cwd);
    const router = createMemoryRouter([{ path: "/local", element: createElement(LocalPage) }], {
      initialEntries: ["/local"],
    });
    const html = renderToString(
      createElement(QueryClientProvider, { client }, createElement(RouterProvider, { router })),
    );
    expect(html).toContain("Working tree");
    localStorage.removeItem("gitnapse.local.cwd");
  });
});
