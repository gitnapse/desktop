import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import * as bridge from "../lib/bridge";

export const authQueryKey = ["auth-status"] as const;
export const apiAuthQueryKey = ["api-auth-status"] as const;

export function invalidateAuthState(queryClient: QueryClient): void {
  void queryClient.invalidateQueries({ queryKey: authQueryKey });
  void queryClient.invalidateQueries({ queryKey: apiAuthQueryKey });
  void queryClient.invalidateQueries({ queryKey: ["api-user"] });
}

export function useSignOut() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bridge.authClearToken,
    onSuccess: () => invalidateAuthState(queryClient),
  });
}
