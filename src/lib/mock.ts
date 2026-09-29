import type * as T from "./types";

type Args = Record<string, unknown>;
type Handler = (args: Args) => unknown;

function requireString(args: Args, key: string): string {
  const value = args[key];
  if (typeof value !== "string") {
    throw new Error(`[mock] missing string argument '${key}'`);
  }
  return value;
}

function optionalString(args: Args, key: string): string | undefined {
  const value = args[key];
  return typeof value === "string" ? value : undefined;
}

function requireNumber(args: Args, key: string): number {
  const value = args[key];
  if (typeof value !== "number") {
    throw new Error(`[mock] missing number argument '${key}'`);
  }
  return value;
}

function optionalNumber(args: Args, key: string): number | undefined {
  const value = args[key];
  return typeof value === "number" ? value : undefined;
}

function optionalBoolean(args: Args, key: string): boolean | undefined {
  const value = args[key];
  return typeof value === "boolean" ? value : undefined;
}

function copy<T>(value: T): T {
  return structuredClone(value);
}

function encodeBase64(text: string): string {
  return typeof btoa === "function" ? btoa(text) : "";
}

function timestamp(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function paginate<T>(list: readonly T[], args: Args, defaultPerPage = 30): T[] {
  const page = Math.max(1, optionalNumber(args, "page") ?? 1);
  const perPage = Math.max(1, optionalNumber(args, "perPage") ?? defaultPerPage);
  return list.slice((page - 1) * perPage, page * perPage);
}

const MOCK_NOW = "2026-09-29T09:00:00Z";
const MOCK_URL = "http://127.0.0.1:8787";

// ── Actors / profiles ───────────────────────────────────────────────────

const xscriptor: T.ActorDto = {
  login: "xscriptor",
  avatar_url: null,
};

const octocat: T.ActorDto = {
  login: "octocat",
  avatar_url: null,
};

const ada: T.ActorDto = {
  login: "ada-lovelace",
  avatar_url: null,
};

const profiles: T.UserProfileDto[] = [
  {
    login: "xscriptor",
    name: "Xscriptor",
    avatar_url: null,
    bio: "Writer, engineer, collector of dot-matrix type.",
    company: "GitNapse",
    location: "Remote",
    blog: "https://xscriptor.com",
    followers: 812,
    following: 96,
    public_repos: 34,
    html_url: "https://github.com/xscriptor",
    created_at: "2019-04-02T08:12:00Z",
  },
  {
    login: "octocat",
    name: "The Octocat",
    avatar_url: null,
    bio: null,
    company: "@github",
    location: "San Francisco",
    blog: "https://github.blog",
    followers: 16234,
    following: 9,
    public_repos: 8,
    html_url: "https://github.com/octocat",
    created_at: "2011-01-25T18:44:36Z",
  },
  {
    login: "ada-lovelace",
    name: "Ada Lovelace",
    avatar_url: null,
    bio: "First programmer. Still debugging.",
    company: null,
    location: "London",
    blog: null,
    followers: 9231,
    following: 41,
    public_repos: 12,
    html_url: "https://github.com/ada-lovelace",
    created_at: "2012-06-11T09:00:00Z",
  },
];

// ── Repositories ────────────────────────────────────────────────────────

const createdAtByRepo = new Map<string, string>();

function repo(
  owner: string,
  name: string,
  description: string,
  language: string | null,
  stars: number,
  forks: number,
  openIssues: number,
  createdAt = "2025-02-01T10:00:00Z",
  pushedAt = "2026-09-26T14:31:00Z",
): T.RepoDto {
  const fullName = `${owner}/${name}`;
  createdAtByRepo.set(fullName, createdAt);
  return {
    full_name: fullName,
    name,
    owner,
    description,
    stargazers_count: stars,
    language,
    default_branch: "main",
    clone_url: `https://github.com/${fullName}.git`,
    html_url: `https://github.com/${fullName}`,
    forks_count: forks,
    open_issues_count: openIssues,
    watchers_count: stars,
    private: false,
    topics: [],
    updated_at: "2026-09-26T14:31:00Z",
    pushed_at: pushedAt,
    owner_avatar_url: null,
  };
}

const repos: T.RepoDto[] = [
  repo("gitnapse", "gitnapse", "Core SDK: GitHub provider, auth, config, local git engine, TUI/CLI", "Rust", 1284, 96, 23, "2024-11-02T09:00:00Z", "2026-09-28T16:42:00Z"),
  repo("gitnapse", "api", "Wire protocol, HTTP server (axum) and typed client", "Rust", 342, 41, 11, "2025-01-20T09:00:00Z", "2026-09-27T11:20:00Z"),
  repo("gitnapse", "desktop", "GitHub dashboard: Tauri 2 + Rust bridge + React 19", "TypeScript", 517, 38, 7, "2025-03-14T09:00:00Z", "2026-09-29T09:00:00Z"),
  repo("gitnapse", "themes", "Public theme registry: index.json + colors/*.jsonc", "JSONC", 96, 14, 2, "2025-06-01T09:00:00Z", "2026-08-15T09:00:00Z"),
  repo("xscriptor", "xscriptor", "Literary portfolio: five locales, four book readers", "TypeScript", 211, 19, 4, "2019-04-02T08:12:00Z", "2026-09-20T17:26:00Z"),
  repo("octocat", "hello-world", "This your first repo!", null, 2912, 2194, 141, "2011-01-25T18:44:36Z", "2012-03-10T12:00:00Z"),
];

repos[0]!.topics = ["rust", "tui", "github-api", "cli"];
repos[2]!.topics = ["tauri", "react", "glassmorphism", "typescript"];

function sortRepoList(list: readonly T.RepoDto[], sort: string): T.RepoDto[] {
  const sorted = [...list];
  switch (sort) {
    case "full_name":
      return sorted.sort((a, b) => a.full_name.localeCompare(b.full_name));
    case "created":
      return sorted.sort(
        (a, b) =>
          timestamp(createdAtByRepo.get(b.full_name) ?? b.updated_at) -
          timestamp(createdAtByRepo.get(a.full_name) ?? a.updated_at),
      );
    case "pushed":
      return sorted.sort(
        (a, b) => timestamp(b.pushed_at ?? b.updated_at) - timestamp(a.pushed_at ?? a.updated_at),
      );
    default:
      return sorted.sort((a, b) => timestamp(b.updated_at) - timestamp(a.updated_at));
  }
}

// ── Commits ─────────────────────────────────────────────────────────────

function commit(
  sha: string,
  message: string,
  authorName: string,
  authorLogin: string,
  authorDate: string,
): T.CommitDto {
  return {
    sha,
    message,
    author_name: authorName,
    author_date: authorDate,
    author: { login: authorLogin, avatar_url: null },
  };
}

const commits: T.CommitDto[] = [
  commit("4f1c9a7d2e8b6c3f0a1d4e7b9c2f5a8d1e4b7c0f", "Add glass token contract", "Xscriptor", "xscriptor", "2026-09-28T16:42:00Z"),
  commit("9d2e5b8a1c4f7e0d3b6a9c2f5e8b1d4a7c0f3e6b", "Type the bridge command surface", "Xscriptor", "xscriptor", "2026-09-27T11:20:00Z"),
  commit("2a5c8e1b4d7f0a3c6e9b2d5f8a1c4e7b0d3f6a9c", "Freeze sidecar lifecycle states", "Ada Lovelace", "ada-lovelace", "2026-09-26T09:05:00Z"),
  commit("7b0d3f6a9c2e5b8d1f4a7c0e3b6d9f2a5c8e1b4d", "Parse porcelain v2 branch headers", "Xscriptor", "xscriptor", "2026-09-25T18:11:00Z"),
  commit("3e6b9d2f5a8c1e4b7d0f3a6c9e2b5d8f1a4c7e0b", "Stream clone progress events", "Ada Lovelace", "ada-lovelace", "2026-09-24T13:47:00Z"),
  commit("8c1e4b7d0f3a6c9e2b5d8f1a4c7e0b3d6f9a2c5e", "Module boundaries and fitness checks", "Octocat", "octocat", "2026-09-23T10:02:00Z"),
  commit("1f4a7c0e3b6d9f2a5c8e1b4d7f0a3c6e9b2d5f8a", "Config: clone dir precedence", "Xscriptor", "xscriptor", "2026-09-22T15:38:00Z"),
  commit("6d9f2a5c8e1b4d7f0a3c6e9b2d5f8a1c4e7b0d3f", "Device flow: no TTY, step-wise API", "Ada Lovelace", "ada-lovelace", "2026-09-21T08:54:00Z"),
  commit("0a3c6e9b2d5f8a1c4e7b0d3f6a9c2e5b8d1f4a7c", "Diff modes over plumbing output", "Xscriptor", "xscriptor", "2026-09-20T17:26:00Z"),
  commit("5e8b1d4a7c0f3e6b9d2f5a8c1e4b7d0f3a6c9e2b", "Protocol DTO additive evolution", "Octocat", "octocat", "2026-09-19T12:13:00Z"),
];

// ── Local git fixtures ──────────────────────────────────────────────────

const branches: T.GitBranch[] = [
  { name: "main", current: true, upstream: "origin/main", ahead: 0, behind: 0 },
  { name: "feat/glass-shell", current: false, upstream: "origin/feat/glass-shell", ahead: 3, behind: 0 },
  { name: "fix/router-paths", current: false, upstream: "origin/fix/router-paths", ahead: 1, behind: 2 },
  { name: "release/0.1", current: false, upstream: null, ahead: 0, behind: 0 },
];

const tags: T.GitTag[] = [
  { name: "v0.1.0", message: "First desktop preview", date: "2026-09-12T10:00:00Z" },
  { name: "v0.0.9", message: null, date: "2026-08-30T10:00:00Z" },
  { name: "v0.0.8", message: null, date: "2026-08-02T10:00:00Z" },
];

const remotes: T.GitRemote[] = [
  { name: "origin", fetch_url: "https://github.com/gitnapse/gitnapse.git", push_url: null },
  { name: "fork", fetch_url: "git@github.com:xscriptor/gitnapse.git", push_url: null },
];

const stash: T.GitStashEntry[] = [
  { index: 0, name: "stash@{0}", message: "WIP: glass audit lines", date: "2026-09-27T19:44:00Z" },
  { index: 1, name: "stash@{1}", message: "WIP: table numerals", date: "2026-09-24T11:02:00Z" },
];

const localLog: T.GitLogEntry[] = commits.map((entry) => ({
  hash: entry.sha,
  short: entry.sha.slice(0, 7),
  author_name: entry.author_name,
  author_email: `${entry.author?.login ?? "unknown"}@users.noreply.github.com`,
  date: entry.author_date,
  subject: entry.message,
}));

const localStatus: T.GitStatus = {
  branch: "feat/glass-shell",
  detached: false,
  ahead: 3,
  behind: 0,
  clean: false,
  staged: [
    { path: "src/styles/tokens.css", orig_path: null, kind: "modified", staged: true },
    { path: "src/styles/glass.css", orig_path: null, kind: "added", staged: true },
  ],
  unstaged: [
    { path: "src/lib/bridge.ts", orig_path: null, kind: "modified", staged: false },
    { path: "src/app/Shell.tsx", orig_path: null, kind: "modified", staged: false },
  ],
  untracked: ["desktop/docs/DESIGN.md"],
  conflicted: [],
};

const diffWorktree = [
  "diff --git a/src/lib/bridge.ts b/src/lib/bridge.ts",
  "index 3f1a2b4..8c0d5e7 100644",
  "--- a/src/lib/bridge.ts",
  "+++ b/src/lib/bridge.ts",
  "@@ -12,6 +12,7 @@ import type { UnlistenFn } from \"@tauri-apps/api/event\";",
  " import { mockInvoke } from \"./mock\";",
  "+import type { GitDiffMode } from \"./types\";",
  "",
  " export { isTauri };",
  "",
].join("\n");

// ── Remote fixtures ─────────────────────────────────────────────────────

function issue(
  number: number,
  title: string,
  state: string,
  user: T.ActorDto,
  labels: string[],
  isPr = false,
): T.IssueDto {
  return {
    number,
    title,
    state,
    body: `Placeholder body for issue #${number}.`,
    user,
    labels: labels.map((name) => ({ name, color: "8b949e" })),
    created_at: "2026-09-18T09:30:00Z",
    updated_at: "2026-09-27T16:12:00Z",
    html_url: `https://github.com/gitnapse/desktop/issues/${number}`,
    is_pr: isPr,
  };
}

const issues: T.IssueDto[] = [
  issue(142, "Glass levels: audit lines for topbar and sidebar", "open", xscriptor, ["docs"]),
  issue(139, "Command palette: keyboard trap on arrow wrap", "open", ada, ["a11y", "bug"]),
  issue(137, "Surface clone progress events in the local page", "open", xscriptor, ["feature"]),
  issue(131, "Space Mono labels clip below 11px on WebKitGTK", "closed", octocat, ["platform"]),
  issue(128, "Lock file: dedupe tauri api entry", "closed", xscriptor, ["chore"]),
  issue(121, "Rate-limit chip in the topbar", "closed", ada, ["feature"]),
];

const issueCommentFixtures: T.IssueCommentDto[] = [
  {
    id: 7001,
    body: "Worst-case backdrop for the thin bar is the raised surface; the numbers pass with margin.",
    user: ada,
    created_at: "2026-09-27T16:00:00Z",
    updated_at: "2026-09-27T16:00:00Z",
    html_url: "https://github.com/gitnapse/desktop/issues/142#issuecomment-7001",
  },
  {
    id: 7002,
    body: "Keyboard wrap fixed in the palette; Escape restores focus to the trigger.",
    user: xscriptor,
    created_at: "2026-09-27T16:12:00Z",
    updated_at: "2026-09-27T16:12:00Z",
    html_url: "https://github.com/gitnapse/desktop/issues/142#issuecomment-7002",
  },
];

const prConversationFixtures: T.IssueCommentDto[] = [
  {
    id: 7101,
    body: "Token contract reads well; one nit on the audit line below.",
    user: ada,
    created_at: "2026-09-28T09:10:00Z",
    updated_at: "2026-09-28T09:10:00Z",
    html_url: "https://github.com/gitnapse/desktop/pull/88#issuecomment-7101",
  },
];

function pull(
  number: number,
  title: string,
  state: string,
  user: T.ActorDto,
  head: string,
  base: string,
  merged: boolean,
): T.PrDetailDto {
  return {
    number,
    title,
    state,
    body: `Placeholder body for pull request #${number}.`,
    html_url: `https://github.com/gitnapse/desktop/pull/${number}`,
    user,
    created_at: "2026-09-20T10:15:00Z",
    updated_at: "2026-09-28T08:45:00Z",
    merge_commit_sha: merged ? "4f1c9a7d2e8b6c3f0a1d4e7b9c2f5a8d1e4b7c0f" : null,
    merged,
    merged_by: merged ? xscriptor : null,
    additions: 480 + number,
    deletions: 96 + number,
    changed_files: 12 + (number % 7),
    commits: 4,
    comments: 2,
    review_comments: 1,
    head: { label: `${user.login}:${head}`, ref: head, sha: "4f1c9a7d2e8b6c3f0a1d4e7b9c2f5a8d1e4b7c0f" },
    base: { label: `gitnapse:${base}`, ref: base, sha: "9d2e5b8a1c4f7e0d3b6a9c2f5e8b1d4a7c0f3e6b" },
    labels: [],
  };
}

const pulls: T.PrDetailDto[] = [
  pull(88, "Glass design system + React shell", "open", xscriptor, "feat/glass-shell", "main", false),
  pull(84, "Typed bridge for the frozen command contract", "open", ada, "feat/typed-bridge", "main", false),
  pull(79, "Mocks: realistic fixtures for browser preview", "open", xscriptor, "feat/mocks", "main", false),
  pull(72, "Vite 8 + React 19 scaffold", "closed", octocat, "chore/vite8", "main", true),
  pull(64, "Sidecar lifecycle health retries", "closed", ada, "fix/sidecar-health", "main", true),
];

const prFileFixtures: T.DiffFileDto[] = [
  { filename: "src/styles/tokens.css", status: "added", additions: 212, deletions: 0, changes: 212, patch: null },
  { filename: "src/ui/Panel.tsx", status: "added", additions: 74, deletions: 0, changes: 74, patch: null },
  { filename: "src/lib/bridge.ts", status: "modified", additions: 320, deletions: 18, changes: 338, patch: diffWorktree },
];

function release(
  tagName: string,
  name: string | null,
  prerelease: boolean,
  publishedAt: string | null,
): T.ReleaseDto {
  return {
    tag_name: tagName,
    name,
    body: `Release notes for ${tagName}.`,
    html_url: `https://github.com/gitnapse/desktop/releases/tag/${tagName}`,
    created_at: publishedAt ?? "2026-09-12T10:00:00Z",
    published_at: publishedAt,
    prerelease,
  };
}

const releases: T.ReleaseDto[] = [
  release("v0.1.0", "Desktop preview", false, "2026-09-12T10:00:00Z"),
  release("v0.1.0-rc.2", "Release candidate 2", true, "2026-09-08T10:00:00Z"),
  release("v0.1.0-rc.1", "Release candidate 1", true, "2026-09-01T10:00:00Z"),
];

const checkRunFixtures: T.CheckRunDto[] = [
  { name: "cargo test -p gitnapse-bridge", status: "completed", conclusion: "success", html_url: "https://github.com/gitnapse/desktop/actions/runs/8101/job/1", started_at: "2026-09-28T14:00:00Z", completed_at: "2026-09-28T14:06:00Z" },
  { name: "tsc + vite build", status: "completed", conclusion: "success", html_url: "https://github.com/gitnapse/desktop/actions/runs/8101/job/2", started_at: "2026-09-28T14:00:00Z", completed_at: "2026-09-28T14:03:00Z" },
  { name: "vitest run", status: "in_progress", conclusion: null, html_url: "https://github.com/gitnapse/desktop/actions/runs/8101/job/3", started_at: "2026-09-28T14:03:00Z", completed_at: null },
];

const workflowRunFixtures: T.WorkflowRunDto[] = [
  { name: "frontend", status: "completed", conclusion: "success", html_url: "https://github.com/gitnapse/desktop/actions/runs/8101", created_at: "2026-09-28T14:00:00Z", updated_at: "2026-09-28T14:08:00Z" },
  { name: "bridge", status: "completed", conclusion: "success", html_url: "https://github.com/gitnapse/desktop/actions/runs/8100", created_at: "2026-09-27T09:12:00Z", updated_at: "2026-09-27T09:20:00Z" },
  { name: "frontend", status: "completed", conclusion: "failure", html_url: "https://github.com/gitnapse/desktop/actions/runs/8099", created_at: "2026-09-26T17:40:00Z", updated_at: "2026-09-26T17:49:00Z" },
  { name: "bridge", status: "queued", conclusion: null, html_url: "https://github.com/gitnapse/desktop/actions/runs/8098", created_at: "2026-09-26T17:39:00Z", updated_at: "2026-09-26T17:39:00Z" },
];

const notificationFixtures: T.NotificationDto[] = [
  { id: "n-1", unread: true, reason: "review_requested", subject_title: "Glass design system + React shell", subject_type: "PullRequest", repo: "gitnapse/desktop", updated_at: "2026-09-28T08:45:00Z", html_url: "https://github.com/gitnapse/desktop/pull/88" },
  { id: "n-2", unread: true, reason: "mention", subject_title: "Command palette: keyboard trap on arrow wrap", subject_type: "Issue", repo: "gitnapse/desktop", updated_at: "2026-09-27T16:12:00Z", html_url: "https://github.com/gitnapse/desktop/issues/139" },
  { id: "n-3", unread: false, reason: "ci_activity", subject_title: "frontend run #214 succeeded", subject_type: "CheckSuite", repo: "gitnapse/desktop", updated_at: "2026-09-28T14:08:00Z", html_url: "https://github.com/gitnapse/desktop/actions/runs/8101" },
  { id: "n-4", unread: false, reason: "subscribed", subject_title: "v0.1.0", subject_type: "Release", repo: "gitnapse/desktop", updated_at: "2026-09-12T10:00:00Z", html_url: "https://github.com/gitnapse/desktop/releases/tag/v0.1.0" },
];

const eventFixtures: T.EventDto[] = [
  { id: "e-1", kind: "push", actor: "xscriptor", actor_avatar_url: null, repo: "gitnapse/desktop", action: null, title: "Pushed 3 commits to feat/glass-shell", created_at: "2026-09-28T14:00:00Z" },
  { id: "e-2", kind: "pull_request", actor: "ada-lovelace", actor_avatar_url: null, repo: "gitnapse/desktop", action: "opened", title: "Opened pull request #88", created_at: "2026-09-27T09:30:00Z" },
  { id: "e-3", kind: "issues", actor: "xscriptor", actor_avatar_url: null, repo: "gitnapse/gitnapse", action: "closed", title: "Closed issue #131", created_at: "2026-09-26T18:02:00Z" },
  { id: "e-4", kind: "release", actor: "xscriptor", actor_avatar_url: null, repo: "gitnapse/desktop", action: "published", title: "Published release v0.1.0", created_at: "2026-09-12T10:00:00Z" },
];

const codeItems: T.CodeSearchResultDto[] = [
  { repo: "gitnapse/desktop", path: "src/styles/glass.css", name: "glass.css", sha: "aa11", html_url: "https://github.com/gitnapse/desktop/blob/main/src/styles/glass.css" },
  { repo: "gitnapse/desktop", path: "src/styles/tokens.css", name: "tokens.css", sha: "aa12", html_url: "https://github.com/gitnapse/desktop/blob/main/src/styles/tokens.css" },
  { repo: "gitnapse/desktop", path: "bridge/src/dto.rs", name: "dto.rs", sha: "aa13", html_url: "https://github.com/gitnapse/desktop/blob/main/bridge/src/dto.rs" },
];

const treeFixtures: T.TreeNodeDto[] = [
  { path: "Cargo.toml", name: "Cargo.toml", depth: 0, is_dir: false },
  { path: "LICENSE", name: "LICENSE", depth: 0, is_dir: false },
  { path: "README.md", name: "README.md", depth: 0, is_dir: false },
  { path: "src", name: "src", depth: 0, is_dir: true },
  { path: "src/auth.rs", name: "auth.rs", depth: 1, is_dir: false },
  { path: "src/git.rs", name: "git.rs", depth: 1, is_dir: false },
  { path: "src/lib.rs", name: "lib.rs", depth: 1, is_dir: false },
  { path: "tests", name: "tests", depth: 0, is_dir: true },
  { path: "tests/auth_precedence.rs", name: "auth_precedence.rs", depth: 1, is_dir: false },
];

const languageFixtures: T.LanguageDto[] = [
  { name: "Rust", bytes: 1864200 },
  { name: "Shell", bytes: 24100 },
  { name: "Makefile", bytes: 8200 },
];

const contributorFixtures: T.ContributorDto[] = [
  { login: "xscriptor", avatar_url: null, contributions: 412, html_url: "https://github.com/xscriptor" },
  { login: "ada-lovelace", avatar_url: null, contributions: 208, html_url: "https://github.com/ada-lovelace" },
  { login: "octocat", avatar_url: null, contributions: 96, html_url: "https://github.com/octocat" },
];

const prReviewFixtures: T.PrReviewDto[] = [
  { id: 6101, user: ada, body: "Token contract reads well.", state: "APPROVED", submitted_at: "2026-09-28T09:00:00Z", commit_id: commits[0]!.sha },
  { id: 6102, user: octocat, body: "Audit line missing for the sheet.", state: "CHANGES_REQUESTED", submitted_at: "2026-09-28T10:30:00Z", commit_id: commits[0]!.sha },
];

const prCommentFixtures: T.PrCommentDto[] = [
  { id: 6201, body: "Nit: keep the edge at 1px.", user: ada, path: "src/styles/glass.css", position: 42, commit_id: commits[0]!.sha, created_at: "2026-09-28T09:15:00Z", updated_at: "2026-09-28T09:15:00Z" },
];

// ── Mock state ──────────────────────────────────────────────────────────

interface MockState {
  token: boolean;
  source: string;
  login: string;
  devicePolls: number;
  cloneDir: string;
  serverState: T.ServerState;
  serverOwned: boolean;
  repos: T.RepoDto[];
  issues: T.IssueDto[];
  issueComments: T.IssueCommentDto[];
  prConversation: T.IssueCommentDto[];
  pulls: T.PrDetailDto[];
  releases: T.ReleaseDto[];
  notifications: T.NotificationDto[];
  branchList: T.GitBranch[];
  tagList: T.GitTag[];
  remoteList: T.GitRemote[];
  stashList: T.GitStashEntry[];
  status: T.GitStatus;
  log: T.GitLogEntry[];
  nextCommentId: number;
}

const state: MockState = {
  token: true,
  source: "OAuth session",
  login: "xscriptor",
  devicePolls: 0,
  cloneDir: "/mock/projects",
  serverState: "running",
  serverOwned: true,
  repos: copy(repos),
  issues: copy(issues),
  issueComments: copy(issueCommentFixtures),
  prConversation: copy(prConversationFixtures),
  pulls: copy(pulls),
  releases: copy(releases),
  notifications: copy(notificationFixtures),
  branchList: copy(branches),
  tagList: copy(tags),
  remoteList: copy(remotes),
  stashList: copy(stash),
  status: copy(localStatus),
  log: copy(localLog),
  nextCommentId: 9001,
};

function findRepo(fullName: string): T.RepoDto {
  const found = state.repos.find((entry) => entry.full_name === fullName);
  if (!found) {
    throw new Error(`[mock] repository not found: ${fullName}`);
  }
  return found;
}

function findIssue(number: number): T.IssueDto {
  const found = state.issues.find((entry) => entry.number === number);
  if (!found) {
    throw new Error(`[mock] issue not found: #${number}`);
  }
  return found;
}

function findPull(number: number): T.PrDetailDto {
  const found = state.pulls.find((entry) => entry.number === number);
  if (!found) {
    throw new Error(`[mock] pull request not found: #${number}`);
  }
  return found;
}

function findProfile(login: string): T.UserProfileDto {
  const found = profiles.find((entry) => entry.login === login);
  if (!found) {
    throw new Error(`[mock] user not found: ${login}`);
  }
  return found;
}

function serverStatus(): T.ServerStatus {
  return {
    state: state.serverState,
    version: state.serverState === "running" ? "0.1.0-mock" : null,
    url: MOCK_URL,
    owned: state.serverOwned,
  };
}

function mutateStatus(mutate: (status: T.GitStatus) => void): void {
  const next = copy(state.status);
  mutate(next);
  next.clean =
    next.staged.length === 0 &&
    next.unstaged.length === 0 &&
    next.untracked.length === 0 &&
    next.conflicted.length === 0;
  state.status = next;
}

const handlers: Record<string, Handler> = {
  auth_status: () => ({
    has_token: state.token,
    source: state.source,
    login: state.token ? state.login : null,
  }),
  auth_set_token: (args) => {
    const token = requireString(args, "token");
    state.token = token.length > 0;
    state.source = "stored token";
    return null;
  },
  auth_clear_token: () => {
    state.token = false;
    state.source = "none";
    return null;
  },
  auth_login_begin: () => {
    state.devicePolls = 0;
    return {
      user_code: "ABCD-1234",
      verification_uri: "https://github.com/login/device",
      device_code: "mock-device-code",
      interval: 1,
      expires_in: 900,
    };
  },
  auth_login_poll: (args) => {
    requireString(args, "deviceCode");
    state.devicePolls += 1;
    if (state.devicePolls < 2) {
      return { status: "pending", login: null };
    }
    state.token = true;
    state.source = "OAuth session";
    return { status: "done", login: state.login };
  },
  clone_dir: () => state.cloneDir,
  set_clone_dir: (args) => {
    const dir = optionalString(args, "dir");
    if (dir !== undefined) {
      state.cloneDir = dir;
    }
    return state.cloneDir;
  },
  clone_repo: (args) => {
    const spec = requireString(args, "spec");
    const dir = optionalString(args, "dir") ?? state.cloneDir;
    const name = spec.replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");
    return { path: `${dir}/${name}`, full_name: name.includes("/") ? name : `xscriptor/${name}` };
  },
  git_repo_info: () => ({
    root: "/mock/projects/gitnapse/desktop",
    name: "desktop",
    remote: "https://github.com/gitnapse/desktop.git",
    full_name: "gitnapse/desktop",
    branch: state.status.branch,
    detached: state.status.detached,
    ahead: state.status.ahead,
    behind: state.status.behind,
  }),
  git_status: () => copy(state.status),
  git_log: (args) => copy(state.log.slice(0, optionalNumber(args, "limit") ?? 20)),
  git_diff: (args) => {
    const mode = args["mode"];
    if (typeof mode !== "object" || mode === null || !("kind" in mode)) {
      throw new Error("[mock] git_diff requires a mode object");
    }
    const kind = (mode as { kind: unknown }).kind;
    if (kind === "staged") {
      return diffWorktree.replace("index 3f1a2b4..8c0d5e7", "index 3f1a2b4..3f1a2b4");
    }
    if (kind === "commit") {
      return diffWorktree;
    }
    if (kind === "range") {
      return diffWorktree;
    }
    return diffWorktree;
  },
  git_stage: (args) => {
    const paths = args["paths"];
    if (!Array.isArray(paths)) {
      throw new Error("[mock] git_stage requires paths");
    }
    mutateStatus((status) => {
      const wanted = new Set(paths.map(String));
      status.unstaged = status.unstaged.filter((change) => !wanted.has(change.path));
      status.untracked = status.untracked.filter((path) => !wanted.has(path));
      for (const path of wanted) {
        status.staged.push({ path, orig_path: null, kind: "modified", staged: true });
      }
      status.staged = status.staged.filter(
        (change, index, all) => all.findIndex((entry) => entry.path === change.path) === index,
      );
    });
    return null;
  },
  git_unstage: (args) => {
    const paths = args["paths"];
    if (!Array.isArray(paths)) {
      throw new Error("[mock] git_unstage requires paths");
    }
    mutateStatus((status) => {
      const wanted = new Set(paths.map(String));
      const moved = status.staged.filter((change) => wanted.has(change.path));
      status.staged = status.staged.filter((change) => !wanted.has(change.path));
      status.unstaged.push(...moved.map((change) => ({ ...change, staged: false })));
    });
    return null;
  },
  git_discard: (args) => {
    const paths = args["paths"];
    if (!Array.isArray(paths)) {
      throw new Error("[mock] git_discard requires paths");
    }
    mutateStatus((status) => {
      const wanted = new Set(paths.map(String));
      status.unstaged = status.unstaged.filter((change) => !wanted.has(change.path));
      status.untracked = status.untracked.filter((path) => !wanted.has(path));
    });
    return null;
  },
  git_commit: (args) => {
    const message = requireString(args, "message");
    mutateStatus((status) => {
      status.staged = [];
      status.ahead += 1;
    });
    const hash = `${state.log.length}c0ffee1`.padEnd(40, "0");
    state.log = [
      {
        hash,
        short: hash.slice(0, 7),
        author_name: "Xscriptor",
        author_email: "xscriptor@users.noreply.github.com",
        date: MOCK_NOW,
        subject: message,
      },
      ...state.log,
    ];
    return hash;
  },
  git_push: (args) => `pushed ${requireString(args, "cwd")} to ${optionalString(args, "remote") ?? "origin"}\n`,
  git_pull: () => "Already up to date.\n",
  git_fetch: () => "fetched origin\n",
  git_branches: () => copy(state.branchList),
  git_checkout: (args) => {
    const branch = requireString(args, "branch");
    const create = optionalBoolean(args, "create") ?? false;
    if (create && !state.branchList.some((entry) => entry.name === branch)) {
      state.branchList = [
        ...state.branchList,
        { name: branch, current: false, upstream: null, ahead: 0, behind: 0 },
      ];
    }
    state.branchList = state.branchList.map((entry) => ({
      ...entry,
      current: entry.name === branch,
    }));
    mutateStatus((status) => {
      status.branch = branch;
    });
    return null;
  },
  git_branch_create: (args) => {
    const name = requireString(args, "name");
    state.branchList = [
      ...state.branchList,
      { name, current: false, upstream: null, ahead: 0, behind: 0 },
    ];
    return null;
  },
  git_branch_delete: (args) => {
    const name = requireString(args, "name");
    state.branchList = state.branchList.filter((entry) => entry.name !== name);
    return null;
  },
  git_merge: (args) => `merged ${requireString(args, "branch")} into ${state.status.branch ?? "main"}\n`,
  git_reset: () => null,
  git_stash_list: () => copy(state.stashList),
  git_stash_push: (args) => {
    const message = optionalString(args, "message") ?? "WIP";
    state.stashList = [
      { index: 0, name: "stash@{0}", message, date: MOCK_NOW },
      ...state.stashList.map((entry) => ({ ...entry, index: entry.index + 1, name: `stash@{${entry.index + 1}}` })),
    ];
    return null;
  },
  git_stash_pop: () => {
    state.stashList = state.stashList
      .slice(1)
      .map((entry) => ({ ...entry, index: entry.index - 1, name: `stash@{${entry.index - 1}}` }));
    return null;
  },
  git_stash_drop: () => {
    state.stashList = state.stashList
      .slice(1)
      .map((entry) => ({ ...entry, index: entry.index - 1, name: `stash@{${entry.index - 1}}` }));
    return null;
  },
  git_tags: () => copy(state.tagList),
  git_tag_create: (args) => {
    const name = requireString(args, "name");
    state.tagList = [
      { name, message: optionalString(args, "message") ?? null, date: MOCK_NOW },
      ...state.tagList,
    ];
    return null;
  },
  git_tag_delete: (args) => {
    const name = requireString(args, "name");
    state.tagList = state.tagList.filter((entry) => entry.name !== name);
    return null;
  },
  git_remotes: () => copy(state.remoteList),
  git_remote_add: (args) => {
    state.remoteList = [
      ...state.remoteList,
      {
        name: requireString(args, "name"),
        fetch_url: requireString(args, "url"),
        push_url: null,
      },
    ];
    return null;
  },
  git_remote_remove: (args) => {
    const name = requireString(args, "name");
    state.remoteList = state.remoteList.filter((entry) => entry.name !== name);
    return null;
  },
  git_remote_rename: (args) => {
    const oldName = requireString(args, "old");
    const newName = requireString(args, "new");
    state.remoteList = state.remoteList.map((entry) =>
      entry.name === oldName ? { ...entry, name: newName } : entry,
    );
    return null;
  },
  server_status: () => serverStatus(),
  server_start: () => {
    state.serverState = "running";
    state.serverOwned = true;
    return serverStatus();
  },
  server_stop: () => {
    if (state.serverOwned) {
      state.serverState = "stopped";
      state.serverOwned = false;
    }
    return serverStatus();
  },
  api_auth_status: () => ({
    has_token: state.token,
    source: state.source,
  }),
  api_set_token: (args) => {
    const token = requireString(args, "token");
    state.token = token.length > 0;
    state.source = "stored token";
    return null;
  },
  api_clear_token: () => {
    state.token = false;
    state.source = "none";
    return null;
  },
  api_user: () => ({ login: state.login }),
  user_profile: (args) => copy(findProfile(requireString(args, "login"))),
  user_repos: (args) => {
    const login = requireString(args, "login");
    const sort = optionalString(args, "sort") ?? "updated";
    const owned = state.repos.filter((entry) => entry.owner === login);
    return copy(paginate(sortRepoList(owned, sort), args, 30));
  },
  starred_repos: (args) =>
    copy(
      paginate(
        [...state.repos].sort((a, b) => b.stargazers_count - a.stargazers_count).filter((entry) => entry.stargazers_count > 300),
        args,
        30,
      ),
    ),
  rate_limit: () => ({ remaining: 4211, reset: 1784310000 }),
  user_events: (args) => {
    const login = requireString(args, "login");
    const mine = eventFixtures.filter((entry) => entry.actor === login);
    return copy(paginate(mine, args, 30));
  },
  notifications: (args) => copy(paginate(state.notifications, args, 30)),
  notification_mark_read: (args) => {
    const id = requireString(args, "id");
    state.notifications = state.notifications.map((entry) =>
      entry.id === id ? { ...entry, unread: false } : entry,
    );
    return null;
  },
  search_repos: (args) => {
    const query = requireString(args, "query").toLowerCase();
    const matches = state.repos.filter(
      (entry) =>
        entry.full_name.toLowerCase().includes(query) ||
        (entry.description ?? "").toLowerCase().includes(query) ||
        (entry.language ?? "").toLowerCase().includes(query),
    );
    return copy(paginate(matches, args, 30));
  },
  search_users: (args) => {
    const query = requireString(args, "query").toLowerCase();
    const matches = profiles.filter((entry) => entry.login.toLowerCase().includes(query));
    return copy(paginate(matches, args, 30));
  },
  search_code: (args) => {
    const query = requireString(args, "query").toLowerCase();
    const matches = codeItems.filter(
      (entry) =>
        entry.name.toLowerCase().includes(query) ||
        entry.path.toLowerCase().includes(query) ||
        entry.repo.toLowerCase().includes(query),
    );
    return copy(paginate(matches, args, 30));
  },
  repo_detail: (args) => copy(findRepo(requireString(args, "repo"))),
  branches: () => copy(state.branchList.map((entry) => entry.name)),
  repo_tree: () => copy(treeFixtures),
  file_content: (args) => {
    const path = requireString(args, "path");
    const text =
      path === "README.md"
        ? "# gitnapse\n\nCore SDK for the GitNapse ecosystem.\n"
        : `Placeholder content for ${path} (mock).\n`;
    return { path, content: encodeBase64(text), size: text.length };
  },
  recent_commits: (args) => copy(commits.slice(0, optionalNumber(args, "perPage") ?? 20)),
  compare_branches: (args) => {
    requireString(args, "base");
    requireString(args, "head");
    return {
      status: "ahead",
      ahead_by: 3,
      behind_by: 0,
      total_commits: 3,
      files: copy(prFileFixtures),
    };
  },
  repo_languages: () => copy(languageFixtures),
  repo_contributors: (args) =>
    copy(contributorFixtures.slice(0, optionalNumber(args, "perPage") ?? contributorFixtures.length)),
  issues: (args) => {
    const stateFilter = optionalString(args, "state");
    const filtered = stateFilter
      ? state.issues.filter((entry) => entry.state === stateFilter)
      : state.issues;
    return copy(paginate(filtered, args, 30));
  },
  issue: (args) => copy(findIssue(requireNumber(args, "number"))),
  issue_comments: () => copy(state.issueComments),
  comment_issue: (args) => {
    const comment: T.IssueCommentDto = {
      id: state.nextCommentId,
      body: requireString(args, "body"),
      user: xscriptor,
      created_at: MOCK_NOW,
      updated_at: MOCK_NOW,
      html_url: "",
    };
    state.nextCommentId += 1;
    // PR numbers share the issue namespace; keep the conversation feed in sync.
    state.issueComments = [...state.issueComments, comment];
    state.prConversation = [...state.prConversation, comment];
    return copy(comment);
  },
  create_issue: (args) => {
    const number = 200 + state.issues.length;
    const created = issue(number, requireString(args, "title"), "open", xscriptor, []);
    created.body = optionalString(args, "body") ?? null;
    state.issues = [created, ...state.issues];
    return copy(created);
  },
  close_issue: (args) => {
    const number = requireNumber(args, "number");
    findIssue(number);
    state.issues = state.issues.map((entry) =>
      entry.number === number ? { ...entry, state: "closed" } : entry,
    );
    return copy(findIssue(number));
  },
  reopen_issue: (args) => {
    const number = requireNumber(args, "number");
    findIssue(number);
    state.issues = state.issues.map((entry) =>
      entry.number === number ? { ...entry, state: "open" } : entry,
    );
    return copy(findIssue(number));
  },
  pull_requests: (args) => {
    const stateFilter = optionalString(args, "state");
    const filtered = stateFilter
      ? state.pulls.filter((entry) => entry.state === stateFilter)
      : state.pulls;
    return copy(
      paginate(filtered, args, 30).map((entry) => ({
        number: entry.number,
        title: entry.title,
        state: entry.state,
        html_url: entry.html_url,
        user: entry.user,
        body: entry.body,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        additions: entry.additions,
        deletions: entry.deletions,
        changed_files: entry.changed_files,
      })),
    );
  },
  pull_request: (args) => copy(findPull(requireNumber(args, "number"))),
  pr_files: () => copy(prFileFixtures),
  pull_request_commits: () => copy(commits.slice(0, 4)),
  pull_request_reviews: () => copy(prReviewFixtures),
  pull_request_comments: () => copy(prCommentFixtures),
  pr_conversation: () => copy(state.prConversation),
  create_pull_request: (args) => {
    const number = 100 + state.pulls.length;
    const created = pull(
      number,
      requireString(args, "title"),
      "open",
      xscriptor,
      requireString(args, "head"),
      requireString(args, "base"),
      false,
    );
    created.body = optionalString(args, "body") ?? null;
    state.pulls = [created, ...state.pulls];
    return copy(created);
  },
  merge_pull_request: (args) => {
    const number = requireNumber(args, "number");
    findPull(number);
    state.pulls = state.pulls.map((entry) =>
      entry.number === number ? { ...entry, merged: true, state: "closed" } : entry,
    );
    return { merged: true, sha: "4f1c9a7d2e8b6c3f0a1d4e7b9c2f5a8d1e4b7c0f", message: `Merged pull request #${number}` };
  },
  update_pull_request: (args) => {
    const number = requireNumber(args, "number");
    const nextState = requireString(args, "state");
    findPull(number);
    state.pulls = state.pulls.map((entry) =>
      entry.number === number ? { ...entry, state: nextState === "closed" ? "closed" : "open" } : entry,
    );
    return null;
  },
  review_pull_request: () => null,
  comment_pull_request: () => null,
  releases: (args) => copy(state.releases.slice(0, optionalNumber(args, "perPage") ?? 30)),
  create_release: (args) => {
    const tagName = requireString(args, "tagName");
    const created = release(
      tagName,
      optionalString(args, "name") ?? tagName,
      optionalBoolean(args, "prerelease") ?? false,
      MOCK_NOW,
    );
    created.body = optionalString(args, "body") ?? null;
    state.releases = [created, ...state.releases];
    return copy(created);
  },
  check_runs: () => copy(checkRunFixtures),
  workflow_runs: (args) => copy(workflowRunFixtures.slice(0, optionalNumber(args, "perPage") ?? 30)),
  create_repo: (args) => {
    const name = requireString(args, "name");
    const created = repo(
      state.login,
      name,
      optionalString(args, "description") ?? "",
      null,
      0,
      0,
      0,
      MOCK_NOW,
      MOCK_NOW,
    );
    created.private = optionalBoolean(args, "private") ?? false;
    state.repos = [created, ...state.repos];
    return copy(created);
  },
  open_in_file_manager: () => null,
  open_external: (args) => {
    const url = requireString(args, "url");
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener,noreferrer");
    }
    return null;
  },
};

export async function mockInvoke<TResult>(command: string, args: Args = {}): Promise<TResult> {
  const handler = handlers[command];
  if (!handler) {
    throw new Error(`[mock] unhandled command: ${command}`);
  }
  return handler(args) as TResult;
}

export const mockCommands: readonly string[] = Object.freeze(Object.keys(handlers));
