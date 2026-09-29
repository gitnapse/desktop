import { describe, expect, it } from "vitest";
import { createElement, type ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
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

function render(children: Parameters<typeof createMemoryRouter>[0], initialEntry: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter(children, { initialEntries: [initialEntry] });
  return renderToString(
    createElement(QueryClientProvider, { client }, createElement(RouterProvider, { router })),
  );
}

const tabs: Array<[string, ComponentType]> = [
  ["overview", OverviewTab],
  ["code", CodeTab],
  ["commits", CommitsTab],
  ["branches", BranchesTab],
  ["compare", CompareTab],
  ["issues", IssuesTab],
  ["pulls", PullsTab],
  ["actions", ActionsTab],
  ["releases", ReleasesTab],
];

describe("page render smoke", () => {
  it("renders the repo page for every tab", () => {
    for (const [path, Component] of tabs) {
      const html = render(
        [
          {
            path: "/repos/:owner/:name",
            element: createElement(RepoPage),
            children: [
              { path: ":tab", element: createElement(Component) },
            ],
          },
        ],
        `/repos/gitnapse/desktop/${path}`,
      );
      expect(html.length).toBeGreaterThan(0);
    }
  });

  it("renders the local page", () => {
    const html = render([{ path: "/local", element: createElement(LocalPage) }], "/local");
    expect(html).toContain("Local");
  });
});
