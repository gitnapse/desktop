import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import * as bridge from "../lib/bridge";
import { clearPersistedCache } from "../lib/queryPersist";

export const authQueryKey = ["auth-status"] as const;
export const apiAuthQueryKey = ["api-auth-status"] as const;

export function invalidateAuthState(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: authQueryKey });
  void queryClient.invalidateQueries({ queryKey: apiAuthQueryKey });
  void queryClient.invalidateQueries({ queryKey: ["api-user"] });
}

/** Drops the in-memory and on-disk caches (sign-out, settings, account swap). */
export function resetCache(queryClient: QueryClient): void {
  void clearPersistedCache();
  queryClient.clear();
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bridge.authClearToken,
    onSuccess: () => resetCache(queryClient),
  });
}

export function useClearCache() {
  const queryClient = useQueryClient();
  return () => resetCache(queryClient);
}
