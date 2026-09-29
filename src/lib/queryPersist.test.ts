import { describe, expect, it } from "vitest";
import { PERSISTED_QUERY_KEYS, shouldPersistQuery, shouldPersistQueryKey } from "./queryPersist";

describe("persisted cache allowlist", () => {
  it("persists public navigation data", () => {
    expect(shouldPersistQueryKey(["repo", "gitnapse/desktop"])).toBe(true);
    expect(shouldPersistQueryKey(["repo-tree", "gitnapse/desktop", "main"])).toBe(true);
    expect(shouldPersistQueryKey(["repo-commits", "o/r", "main", 30])).toBe(true);
    expect(shouldPersistQueryKey(["search-users", "rust", "org"])).toBe(true);
    expect(shouldPersistQueryKey(["notifications"])).toBe(true);
  });

  it("never persists auth, token, device, server or rate-limit queries", () => {
    for (const key of [
      "auth-status",
      "api-auth-status",
      "api-user",
      "server-status",
      "rate-limit",
      "clone-dir",
      "git-status",
      "git-repo-info",
    ]) {
      expect(shouldPersistQueryKey([key]), key).toBe(false);
    }
  });

  it("rejects credential-shaped keys even if allowlisted", () => {
    expect(shouldPersistQueryKey(["oauth-token"])).toBe(false);
    expect(shouldPersistQueryKey(["auth-status", "x"])).toBe(false);
    expect(shouldPersistQueryKey([undefined])).toBe(false);
  });

  it("keeps the allowlist free of credential-shaped roots", () => {
    for (const key of PERSISTED_QUERY_KEYS) {
      expect(/token|auth|oauth|device|password|secret|credential/i.test(key), key).toBe(false);
    }
  });

  it("skips non-success and oversized payloads", () => {
    const pending = { queryKey: ["repo", "o/r"], state: { status: "pending", data: undefined } };
    expect(shouldPersistQuery(pending as never)).toBe(false);

    const hugeArray = {
      queryKey: ["repo-tree", "o/r", "main"],
      state: { status: "success", data: new Array(10_000).fill({ path: "x" }) },
    };
    expect(shouldPersistQuery(hugeArray as never)).toBe(false);

    const hugeString = {
      queryKey: ["file", "o/r", "main", "big.txt"],
      state: { status: "success", data: "x".repeat(500_000) },
    };
    expect(shouldPersistQuery(hugeString as never)).toBe(false);

    const ok = { queryKey: ["repo", "o/r"], state: { status: "success", data: { a: 1 } } };
    expect(shouldPersistQuery(ok as never)).toBe(true);
  });
});
