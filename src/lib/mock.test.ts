import { describe, expect, it } from "vitest";
import { mockInvoke } from "./mock";
import type { AuthStatus, DeviceFlowPoll, DeviceFlowStart, UserProfileDto } from "./types";

describe("auth device flow", () => {
  it("walks pending then done and flips the token state", async () => {
    await mockInvoke("auth_clear_token", {});
    const before = await mockInvoke<AuthStatus>("auth_status", {});
    expect(before.has_token).toBe(false);

    const start = await mockInvoke<DeviceFlowStart>("auth_login_begin", {});
    expect(start.user_code.length).toBeGreaterThan(0);
    expect(start.verification_uri).toContain("github.com");

    const first = await mockInvoke<DeviceFlowPoll>("auth_login_poll", {
      deviceCode: start.device_code,
    });
    expect(first.status).toBe("pending");
    expect(first.login).toBeNull();

    const second = await mockInvoke<DeviceFlowPoll>("auth_login_poll", {
      deviceCode: start.device_code,
    });
    expect(second.status).toBe("done");

    const after = await mockInvoke<AuthStatus>("auth_status", {});
    expect(after.has_token).toBe(true);
    expect(after.source).toBe("OAuth session");
  });
});

describe("user profiles", () => {
  it("search_users matches logins by substring", async () => {
    const users = await mockInvoke<UserProfileDto[]>("search_users", { query: "octo" });
    expect(users.map((user) => user.login)).toEqual(["octocat"]);
  });

  it("api_user returns the bare login while user_profile is rich", async () => {
    const me = await mockInvoke<{ login: string }>("api_user", {});
    expect(me).toEqual({ login: "xscriptor" });

    const profile = await mockInvoke<UserProfileDto>("user_profile", { login: me.login });
    expect(profile.name).toBe("Xscriptor");
    expect(profile.bio).not.toBeNull();
  });
});
