import { describe, expect, it } from "vitest";
import { cleanArgs } from "./bridge";
import { mockCommands, mockInvoke } from "./mock";
import type {
  AuthStatus,
  CodeSearchResultDto,
  DiffFileDto,
  EventDto,
  GitStatus,
  IssueCommentDto,
  LanguageDto,
  RepoDto,
  ServerStatus,
  UserProfileDto,
} from "./types";

describe("cleanArgs", () => {
  it("drops undefined values and keeps defined ones", () => {
    expect(cleanArgs({ cwd: "/repo", limit: undefined, all: false })).toEqual({
      cwd: "/repo",
      all: false,
    });
  });

  it("returns an empty object when nothing is passed", () => {
    expect(cleanArgs({})).toEqual({});
  });
});

describe("mockInvoke protocol shapes", () => {
  it("returns snake_case payloads for auth status", async () => {
    const status = await mockInvoke<AuthStatus>("auth_status", {});
    expect(status).toHaveProperty("has_token");
    expect(typeof status.source).toBe("string");
  });

  it("returns a ServerStatus object, including a normal stopped state", async () => {
    const running = await mockInvoke<ServerStatus>("server_status", {});
    expect(running.state).toBe("running");
    expect(running.url).toContain("127.0.0.1");
    expect(running.owned).toBe(true);

    const stopped = await mockInvoke<ServerStatus>("server_stop", {});
    expect(stopped.state).toBe("stopped");
    expect(stopped.version).toBeNull();

    const restarted = await mockInvoke<ServerStatus>("server_start", {});
    expect(restarted.state).toBe("running");
  });

  it("user_profile and search_users return UserProfileDto", async () => {
    const profile = await mockInvoke<UserProfileDto>("user_profile", { login: "octocat" });
    expect(profile.login).toBe("octocat");
    expect(profile.public_repos).toBeGreaterThan(0);
    expect(profile.html_url).toContain("github.com/octocat");

    const users = await mockInvoke<UserProfileDto[]>("search_users", { query: "octo" });
    expect(users.map((user) => user.login)).toEqual(["octocat"]);
  });

  it("user_repos accepts sort, page and perPage", async () => {
    const repos = await mockInvoke<RepoDto[]>("user_repos", {
      login: "gitnapse",
      sort: "full_name",
      page: 1,
      perPage: 2,
    });
    expect(repos.length).toBe(2);
    const names = repos.map((repo) => repo.full_name);
    expect([...names].sort((a, b) => a.localeCompare(b))).toEqual(names);
    expect(repos.every((repo) => repo.owner === "gitnapse")).toBe(true);
  });

  it("filters repository search results by query", async () => {
    const repos = await mockInvoke<RepoDto[]>("search_repos", { query: "desktop" });
    expect(repos.length).toBeGreaterThan(0);
    for (const repo of repos) {
      const haystack = `${repo.full_name} ${repo.description ?? ""}`.toLowerCase();
      expect(haystack).toContain("desktop");
    }
  });

  it("notifications take page/perPage only", async () => {
    const page = await mockInvoke("notifications", { page: 1, perPage: 2 });
    expect(page).toHaveLength(2);
  });

  it("search_code returns CodeSearchResultDto[]", async () => {
    const results = await mockInvoke<CodeSearchResultDto[]>("search_code", { query: "glass" });
    expect(results.length).toBeGreaterThan(0);
    for (const hit of results) {
      expect(hit.repo).toContain("/");
      expect(hit.path.length).toBeGreaterThan(0);
      expect(hit.html_url).toContain("github.com");
    }
  });

  it("pr_files returns DiffFileDto[]", async () => {
    const files = await mockInvoke<DiffFileDto[]>("pr_files", { repo: "gitnapse/desktop", number: 88 });
    expect(files.length).toBeGreaterThan(0);
    expect(files[0]).toHaveProperty("filename");
    expect(files[0]).toHaveProperty("changes");
  });

  it("pr_conversation returns IssueCommentDto[]", async () => {
    const comments = await mockInvoke<IssueCommentDto[]>("pr_conversation", {
      repo: "gitnapse/desktop",
      number: 88,
    });
    expect(comments.length).toBeGreaterThan(0);
    expect(comments[0]).toHaveProperty("user");
    expect(comments[0]).toHaveProperty("updated_at");
  });

  it("repo_languages returns LanguageDto[]", async () => {
    const languages = await mockInvoke<LanguageDto[]>("repo_languages", { repo: "gitnapse/desktop" });
    expect(languages.map((entry) => entry.name)).toEqual(["Rust", "Shell", "Makefile"]);
    expect(languages[0]?.bytes).toBeGreaterThan(0);
  });

  it("user_events returns EventDto[]", async () => {
    const events = await mockInvoke<EventDto[]>("user_events", { login: "xscriptor" });
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]).toHaveProperty("kind");
    expect(events[0]).toHaveProperty("actor");
    expect(events[0]).toHaveProperty("created_at");
  });

  it("mutates local git state through stage and commit", async () => {
    const before = await mockInvoke<GitStatus>("git_status", { cwd: "/mock" });
    await mockInvoke("git_stage", { cwd: "/mock", paths: ["src/lib/bridge.ts"] });
    const staged = await mockInvoke<GitStatus>("git_status", { cwd: "/mock" });
    expect(staged.staged.some((change) => change.path === "src/lib/bridge.ts")).toBe(true);
    expect(staged.unstaged.some((change) => change.path === "src/lib/bridge.ts")).toBe(false);

    const hash = await mockInvoke<string>("git_commit", { cwd: "/mock", message: "Test commit" });
    expect(hash).toHaveLength(40);

    const after = await mockInvoke<GitStatus>("git_status", { cwd: "/mock" });
    expect(after.staged).toHaveLength(0);
    expect(after.ahead).toBe(before.ahead + 1);
  });

  it("rejects commands without a handler", async () => {
    await expect(mockInvoke("does_not_exist", {})).rejects.toThrow(/unhandled command/);
  });
});

describe("mock coverage", () => {
  it("handles every frozen Tauri command", () => {
    const frozen = [
      "auth_status", "auth_set_token", "auth_clear_token", "auth_login_begin", "auth_login_poll",
      "clone_dir", "set_clone_dir", "clone_repo",
      "git_repo_info", "git_status", "git_log", "git_diff", "git_stage", "git_unstage",
      "git_discard", "git_commit", "git_push", "git_pull", "git_fetch", "git_branches",
      "git_checkout", "git_branch_create", "git_branch_delete", "git_merge", "git_reset",
      "git_stash_list", "git_stash_push", "git_stash_pop", "git_stash_drop", "git_tags",
      "git_tag_create", "git_tag_delete", "git_remotes", "git_remote_add", "git_remote_remove",
      "git_remote_rename",
      "server_status", "server_start", "server_stop",
      "api_auth_status", "api_set_token", "api_clear_token",
      "api_user", "user_profile", "user_repos", "starred_repos", "rate_limit", "user_events",
      "notifications", "notification_mark_read",
      "search_repos", "search_users", "search_code",
      "repo_detail", "branches", "repo_tree", "file_content", "recent_commits",
      "compare_branches", "repo_languages", "repo_contributors",
      "issues", "issue", "issue_comments", "comment_issue", "create_issue", "close_issue",
      "reopen_issue",
      "pull_requests", "pull_request", "pr_files", "pull_request_commits",
      "pull_request_reviews", "pull_request_comments", "pr_conversation", "create_pull_request",
      "merge_pull_request", "update_pull_request", "review_pull_request", "comment_pull_request",
      "releases", "create_release", "check_runs", "workflow_runs", "create_repo",
      "open_in_file_manager", "open_external",
    ];
    for (const command of frozen) {
      expect(mockCommands).toContain(command);
    }
  });
});
