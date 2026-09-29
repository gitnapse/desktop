import { describe, expect, it } from "vitest";
import { createElement, type ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { ThemeProvider } from "../ThemeProvider";
import { authQueryKey } from "../auth";
import SearchPage from "./SearchPage";
import NotificationsPage from "./NotificationsPage";
import SettingsPage from "./SettingsPage";
import HomePage from "./HomePage";
import UserPage from "./UserPage";

function render(element: ReactNode, entry: string, seed?: (client: QueryClient) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  seed?.(client);
  const router = createMemoryRouter([{ path: entry.split("?")[0] ?? "/", element }], {
    initialEntries: [entry],
  });
  return renderToString(
    createElement(
      QueryClientProvider,
      { client },
      createElement(ThemeProvider, null, createElement(RouterProvider, { router })),
    ),
  );
}

describe("app page render smoke", () => {
  it("renders search with the code tab", () => {
    const html = render(createElement(SearchPage), "/search?q=glass&tab=code");
    expect(html).toContain("Code");
  });

  it("renders the notifications page", () => {
    const html = render(createElement(NotificationsPage), "/notifications");
    expect(html).toContain("Notifications");
  });

  it("renders settings inside the theme provider", () => {
    const html = render(createElement(SettingsPage), "/settings");
    expect(html).toContain("Settings");
  });

  it("renders the onboarding home when signed out", () => {
    const html = render(createElement(HomePage), "/", (client) => {
      client.setQueryData(authQueryKey, { has_token: false, source: "None", login: null });
    });
    expect(html).toContain("Connect to GitHub");
  });

  it("renders a user page", () => {
    const html = render(createElement(UserPage), "/users/xscriptor");
    expect(html.length).toBeGreaterThan(0);
  });
});
