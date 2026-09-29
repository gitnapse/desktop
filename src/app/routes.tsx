import { Navigate, createHashRouter } from "react-router-dom";
import { Shell } from "./Shell";

export const router = createHashRouter([
  {
    path: "/",
    element: <Shell />,
    children: [
      {
        index: true,
        lazy: async () => ({ Component: (await import("./pages/HomePage")).default }),
      },
      {
        path: "search",
        lazy: async () => ({ Component: (await import("./pages/SearchPage")).default }),
      },
      {
        path: "local",
        lazy: async () => ({ Component: (await import("./pages/LocalPage")).default }),
      },
      {
        path: "repos/:owner/:name",
        lazy: async () => ({ Component: (await import("./pages/RepoPage")).default }),
        children: [
          { index: true, element: <Navigate to="overview" replace /> },
          {
            path: "overview",
            lazy: async () => ({ Component: (await import("./pages/repo/OverviewTab")).default }),
          },
          {
            path: "code",
            lazy: async () => ({ Component: (await import("./pages/repo/CodeTab")).default }),
          },
          {
            path: "commits",
            lazy: async () => ({ Component: (await import("./pages/repo/CommitsTab")).default }),
          },
          {
            path: "branches",
            lazy: async () => ({ Component: (await import("./pages/repo/BranchesTab")).default }),
          },
          {
            path: "compare",
            lazy: async () => ({ Component: (await import("./pages/repo/CompareTab")).default }),
          },
          {
            path: "issues",
            lazy: async () => ({ Component: (await import("./pages/repo/IssuesTab")).default }),
          },
          {
            path: "pulls",
            lazy: async () => ({ Component: (await import("./pages/repo/PullsTab")).default }),
          },
          {
            path: "actions",
            lazy: async () => ({ Component: (await import("./pages/repo/ActionsTab")).default }),
          },
          {
            path: "releases",
            lazy: async () => ({ Component: (await import("./pages/repo/ReleasesTab")).default }),
          },
        ],
      },
      {
        path: "users/:login",
        lazy: async () => ({ Component: (await import("./pages/UserPage")).default }),
      },
      {
        path: "settings",
        lazy: async () => ({ Component: (await import("./pages/SettingsPage")).default }),
      },
      {
        path: "*",
        lazy: async () => ({ Component: (await import("./pages/NotFoundPage")).default }),
      },
    ],
  },
]);
