// Bridge, protocol and core DTOs — mirror the Rust sources exactly.
//
// Sources of truth:
// - `bridge/src/dto.rs`     → AuthStatus, ServerStatus, CloneResult, DeviceFlow*
// - `gitnapse-protocol`     → every remote GitHub payload (snake_case)
// - `gitnapse::git`         → local typed git payloads
//
// Optional Rust fields serialize as `null` (serde default), never as absent.

// ── Bridge: auth / device flow ─────────────────────────────────────────

export interface AuthStatus {
  has_token: boolean;
  source: string;
  login: string | null;
}

/** Protocol `AuthStatusDto` returned by `api_auth_status`. */
export interface ApiAuthStatus {
  has_token: boolean;
  source: string;
}

export interface DeviceFlowStart {
  user_code: string;
  verification_uri: string;
  device_code: string;
  interval: number;
  expires_in: number;
}

export type DeviceFlowStatus = "pending" | "slow_down" | "done" | "denied" | "expired";

export interface DeviceFlowPoll {
  status: DeviceFlowStatus;
  login: string | null;
}

// ── Bridge: clone / sidecar ────────────────────────────────────────────

export interface CloneResult {
  path: string;
  full_name: string | null;
}

export type ClonePhase =
  | "resolving"
  | "counting"
  | "receiving"
  | "resolving_deltas"
  | "checking_out"
  | "done"
  | "error";

export interface CloneProgress {
  phase: ClonePhase;
  message: string;
  percent: number | null;
}

export type ServerState = "running" | "stopped" | "starting";

export interface ServerStatus {
  state: ServerState;
  version: string | null;
  url: string;
  owned: boolean;
}

// ── Core git DTOs (`gitnapse::git`) ────────────────────────────────────

export interface GitRepoInfo {
  root: string;
  name: string;
  remote: string | null;
  full_name: string | null;
  branch: string | null;
  detached: boolean;
  ahead: number;
  behind: number;
}

export interface FileChange {
  path: string;
  orig_path: string | null;
  kind: string;
  staged: boolean;
}

export interface GitStatus {
  branch: string | null;
  detached: boolean;
  ahead: number;
  behind: number;
  clean: boolean;
  staged: FileChange[];
  unstaged: FileChange[];
  untracked: string[];
  conflicted: string[];
}

export interface GitLogEntry {
  hash: string;
  short: string;
  author_name: string;
  author_email: string;
  date: string;
  subject: string;
}

export interface GitBranch {
  name: string;
  current: boolean;
  upstream: string | null;
  ahead: number;
  behind: number;
}

export interface GitTag {
  name: string;
  message: string | null;
  date: string | null;
}

export interface GitRemote {
  name: string;
  fetch_url: string;
  push_url: string | null;
}

export interface GitStashEntry {
  index: number;
  name: string;
  message: string;
  date: string;
}

/** JS-side `git_diff` request shape (`DiffModeRequest`). */
export type GitDiffMode =
  | { kind: "worktree"; path?: string }
  | { kind: "staged"; path?: string }
  | { kind: "commit"; rev: string; path?: string }
  | { kind: "range"; from: string; to: string; path?: string };

// ── Protocol: infrastructure / users ───────────────────────────────────

export interface ServerHealth {
  status: string;
  version: string;
}

/** Protocol `UserDto` — authenticated login only (`api_user`). */
export interface UserDto {
  login: string;
}

/** Protocol `UserProfileDto` — public profile (`user_profile`, user search). */
export interface UserProfileDto {
  login: string;
  name: string | null;
  avatar_url: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  blog: string | null;
  followers: number;
  following: number;
  public_repos: number;
  html_url: string;
  created_at: string | null;
}

/** Protocol `ActorDto` — comment/issue/PR author or reviewer. */
export interface ActorDto {
  login: string;
  avatar_url: string | null;
}

export interface ContributorDto {
  login: string;
  avatar_url: string | null;
  contributions: number;
  html_url: string | null;
}

export interface RateLimitDto {
  remaining: number | null;
  reset: number | null;
}

// ── Protocol: repositories ─────────────────────────────────────────────

export interface RepoDto {
  full_name: string;
  name: string;
  owner: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  default_branch: string;
  clone_url: string;
  html_url: string | null;
  forks_count: number | null;
  open_issues_count: number | null;
  watchers_count: number | null;
  private: boolean | null;
  topics: string[] | null;
  updated_at: string | null;
  pushed_at: string | null;
  owner_avatar_url: string | null;
}

export interface TreeNodeDto {
  path: string;
  name: string;
  depth: number;
  is_dir: boolean;
}

export interface ContentDto {
  path: string;
  /** File content, base64-encoded (binary-safe). */
  content: string;
  size: number;
}

export interface LanguageDto {
  name: string;
  bytes: number;
}

export interface CodeSearchResultDto {
  repo: string;
  path: string;
  name: string;
  sha: string;
  html_url: string;
}

// ── Protocol: issues / pull requests ───────────────────────────────────

export interface LabelDto {
  name: string;
  color: string;
}

export interface IssueDto {
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: ActorDto;
  labels: LabelDto[];
  created_at: string;
  updated_at: string;
  body: string | null;
  /** Present when the issue is actually a pull request. */
  is_pr: boolean;
}

export interface IssueCommentDto {
  id: number;
  user: ActorDto;
  body: string;
  created_at: string;
  updated_at: string;
  html_url: string;
}

export interface PrBranchDto {
  label: string;
  ref: string;
  sha: string;
}

export interface PrSummaryDto {
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: ActorDto;
  body: string | null;
  created_at: string;
  updated_at: string;
  additions: number | null;
  deletions: number | null;
  changed_files: number | null;
}

export interface PrDetailDto {
  number: number;
  title: string;
  state: string;
  body: string | null;
  html_url: string;
  user: ActorDto;
  created_at: string;
  updated_at: string;
  merge_commit_sha: string | null;
  merged: boolean | null;
  merged_by: ActorDto | null;
  additions: number | null;
  deletions: number | null;
  changed_files: number | null;
  commits: number | null;
  comments: number | null;
  review_comments: number | null;
  head: PrBranchDto;
  base: PrBranchDto;
  labels: LabelDto[];
}

export interface PrReviewDto {
  id: number;
  user: ActorDto;
  body: string | null;
  state: string;
  submitted_at: string | null;
  commit_id: string | null;
}

export interface PrCommentDto {
  id: number;
  user: ActorDto;
  body: string;
  path: string | null;
  position: number | null;
  commit_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface MergeResultDto {
  sha: string;
  merged: boolean;
  message: string;
}

// ── Protocol: commits / diffs / actions / releases ─────────────────────

export interface CommitDto {
  sha: string;
  message: string;
  author_name: string;
  author_date: string;
  author: ActorDto | null;
}

export interface DiffFileDto {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch: string | null;
}

export interface CompareDto {
  status: string;
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  files: DiffFileDto[];
}

export interface CheckRunDto {
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface WorkflowRunDto {
  name: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface ReleaseDto {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  created_at: string;
  published_at: string | null;
  prerelease: boolean;
}

// ── Protocol: activity / notifications ─────────────────────────────────

/** Protocol `EventDto` — compact public activity feed entry. */
export interface EventDto {
  id: string;
  /** `push`, `pull_request`, `issues`, `release`, `create`, `watch`,
   * `fork` or `other`. */
  kind: string;
  actor: string;
  actor_avatar_url: string | null;
  repo: string;
  action: string | null;
  title: string | null;
  created_at: string;
}

export interface NotificationDto {
  id: string;
  unread: boolean;
  reason: string;
  subject_type: string;
  subject_title: string;
  repo: string | null;
  updated_at: string;
  html_url: string | null;
}
