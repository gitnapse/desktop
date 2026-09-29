import { describe, expect, it } from "vitest";
import { createElement, type ComponentType } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "../../../app/ThemeProvider";
import SettingsPage from "../../../app/pages/SettingsPage";
import HomePage from "../../../app/pages/HomePage";
import UserPage from "../../../app/pages/UserPage";
import SearchPage from "../../../app/pages/SearchPage";
import { mockInvoke } from "../../../lib/mock";

function client(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
}

function render(
  queryClient: QueryClient,
  element: ComponentType,
  entry: string,
  path = "*",
): string {
  const router = createMemoryRouter([{ path, element: createElement(element) }], {
    initialEntries: [entry],
  });
  return renderToString(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(ThemeProvider, null, createElement(RouterProvider, { router })),
    ),
  );
}

describe("remote pages render from mock DTOs", () => {
  it("settings shows the ServerStatus object states", async () => {
    const running = client();
    running.setQueryData(["auth-status"], await mockInvoke("auth_status", {}));
    running.setQueryData(["clone-dir"], await mockInvoke("clone_dir", {}));
    running.setQueryData(["server-status"], await mockInvoke("server_status", {}));
    const runningHtml = render(running, SettingsPage, "/settings");
    expect(runningHtml).toContain("RUNNING v0.1.0-mock");
    expect(runningHtml).toContain("http://127.0.0.1:8787");

    const stopped = client();
    stopped.setQueryData(["auth-status"], await mockInvoke("auth_status", {}));
    stopped.setQueryData(["clone-dir"], await mockInvoke("clone_dir", {}));
    stopped.setQueryData(["server-status"], await mockInvoke("server_stop", {}));
    const stoppedHtml = render(stopped, SettingsPage, "/settings");
    expect(stoppedHtml).toContain("STOPPED");
  });

  it("home chains api_user into user_profile", async () => {
    const queryClient = client();
    queryClient.setQueryData(["auth-status"], await mockInvoke("auth_status", {}));
    queryClient.setQueryData(["api-user"], await mockInvoke("api_user", {}));
    queryClient.setQueryData(["user-profile", "xscriptor"], await mockInvoke("user_profile", { login: "xscriptor" }));
    queryClient.setQueryData(["starred-repos", 30], await mockInvoke("starred_repos", { page: 1, perPage: 30 }));
    queryClient.setQueryData(["rate-limit"], await mockInvoke("rate_limit", {}));
    queryClient.setQueryData(["user-events", "xscriptor"], await mockInvoke("user_events", { login: "xscriptor", page: 1, perPage: 30 }));
    const html = render(queryClient, HomePage, "/");
    expect(html).toContain("Xscriptor");
    expect(html).toContain("@xscriptor");
    expect(html).toContain("34");
  });

  it("user page renders the protocol profile and sorted repos", async () => {
    const queryClient = client();
    queryClient.setQueryData(["auth-status"], await mockInvoke("auth_status", {}));
    queryClient.setQueryData(["user-profile", "xscriptor"], await mockInvoke("user_profile", { login: "xscriptor" }));
    queryClient.setQueryData(
      ["user-repos", "xscriptor", "updated"],
      await mockInvoke("user_repos", { login: "xscriptor", sort: "updated", page: 1, perPage: 100 }),
    );
    const html = render(queryClient, UserPage, "/users/xscriptor", "/users/:login");
    expect(html).toContain("Xscriptor");
    expect(html).toContain("812");
    expect(html).toContain("xscriptor/xscriptor");
  });

  it("search renders UserProfileDto results", async () => {
    const queryClient = client();
    queryClient.setQueryData(
      ["search-users", "octo"],
      await mockInvoke("search_users", { query: "octo", page: 1, perPage: 30 }),
    );
    const html = render(queryClient, SearchPage, "/search?q=octo&tab=users");
    expect(html).toContain("octocat");
    expect(html).toContain("16234 followers");
  });
});
