import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ErrorBoundary } from "./app/ErrorBoundary";
import { ThemeProvider } from "./app/ThemeProvider";
import { router } from "./app/routes";
import { queryCacheBuster, queryPersister, shouldPersistQuery } from "./lib/queryPersist";
import { RouterProvider } from "react-router-dom";

const WEEK = 7 * 24 * 60 * 60 * 1000;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: WEEK,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: WEEK,
        buster: queryCacheBuster,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) => shouldPersistQuery(query),
        },
      }}
    >
      <ThemeProvider>
        <ErrorBoundary>
          <RouterProvider router={router} />
        </ErrorBoundary>
      </ThemeProvider>
    </PersistQueryClientProvider>
  );
}
