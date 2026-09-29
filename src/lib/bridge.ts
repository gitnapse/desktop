import { isTauri } from "@tauri-apps/api/core";
import type { UnlistenFn } from "@tauri-apps/api/event";
import { mockInvoke } from "./mock";
import type {
  ApiAuthStatus,
  AuthStatus,
  CheckRunDto,
  CloneProgress,
  CloneResult,
  CodeSearchResultDto,
  CommitDto,
  CompareDto,
  ContentDto,
  ContributorDto,
  DeviceFlowPoll,
  DeviceFlowStart,
  DiffFileDto,
  EventDto,
  GitBranch,
  GitDiffMode,
  GitLogEntry,
  GitRemote,
  GitRepoInfo,
  GitStashEntry,
  GitStatus,
  GitTag,
  IssueCommentDto,
  IssueDto,
  LanguageDto,
  MergeResultDto,
  NotificationDto,
  PrCommentDto,
  PrDetailDto,
  PrReviewDto,
  PrSummaryDto,
  RateLimitDto,
  ReleaseDto,
  RepoDto,
  ServerStatus,
  TreeNodeDto,
  UserDto,
  UserProfileDto,
  WorkflowRunDto,
} from "./types";

export { isTauri };

export function cleanArgs(args: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

async function call<TResult>(
  command: string,
  args: Record<string, unknown> = {},
): Promise<TResult> {
  const payload = cleanArgs(args);
  if (!isTauri()) {
    return mockInvoke<TResult>(command, payload);
  }
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<TResult>(command, payload);
}

export function authStatus(): Promise<AuthStatus> {
  return call("auth_status");
}

export function authSetToken(token: string): Promise<void> {
  return call("auth_set_token", { token });
}

export function authClearToken(): Promise<void> {
  return call("auth_clear_token");
}

export function authLoginBegin(clientId?: string, scopes?: string[]): Promise<DeviceFlowStart> {
  return call("auth_login_begin", { clientId, scopes });
}

export function authLoginPoll(deviceCode: string): Promise<DeviceFlowPoll> {
  return call("auth_login_poll", { deviceCode });
}

export function cloneDir(): Promise<string> {
  return call("clone_dir");
}

export function setCloneDir(dir?: string): Promise<string> {
  return call("set_clone_dir", { dir });
}

export function cloneRepo(spec: string, dir?: string, branch?: string): Promise<CloneResult> {
  return call("clone_repo", { spec, dir, branch });
}

export function gitRepoInfo(cwd: string): Promise<GitRepoInfo> {
  return call("git_repo_info", { cwd });
}

export function gitStatus(cwd: string): Promise<GitStatus> {
  return call("git_status", { cwd });
}

export function gitLog(cwd: string, limit?: number): Promise<GitLogEntry[]> {
  return call("git_log", { cwd, limit });
}

export function gitDiff(cwd: string, mode: GitDiffMode): Promise<string> {
  return call("git_diff", { cwd, mode });
}

export function gitStage(cwd: string, paths: string[]): Promise<void> {
  return call("git_stage", { cwd, paths });
}

export function gitUnstage(cwd: string, paths: string[]): Promise<void> {
  return call("git_unstage", { cwd, paths });
}

export function gitDiscard(cwd: string, paths: string[]): Promise<void> {
  return call("git_discard", { cwd, paths });
}

export function gitCommit(cwd: string, message: string, all?: boolean): Promise<string> {
  return call("git_commit", { cwd, message, all });
}

export function gitPush(
  cwd: string,
  remote?: string,
  branch?: string,
  force?: boolean,
  setUpstream?: boolean,
): Promise<string> {
  return call("git_push", { cwd, remote, branch, force, setUpstream });
}

export function gitPull(cwd: string, rebase?: boolean): Promise<string> {
  return call("git_pull", { cwd, rebase });
}

export function gitFetch(cwd: string, prune?: boolean): Promise<string> {
  return call("git_fetch", { cwd, prune });
}

export function gitBranches(cwd: string): Promise<GitBranch[]> {
  return call("git_branches", { cwd });
}

export function gitCheckout(cwd: string, branch: string, create?: boolean): Promise<void> {
  return call("git_checkout", { cwd, branch, create });
}

export function gitBranchCreate(cwd: string, name: string, from?: string): Promise<void> {
  return call("git_branch_create", { cwd, name, from });
}

export function gitBranchDelete(cwd: string, name: string, force?: boolean): Promise<void> {
  return call("git_branch_delete", { cwd, name, force });
}

export function gitMerge(cwd: string, branch: string): Promise<string> {
  return call("git_merge", { cwd, branch });
}

export function gitReset(cwd: string, target?: string, hard?: boolean): Promise<void> {
  return call("git_reset", { cwd, target, hard });
}

export function gitStashList(cwd: string): Promise<GitStashEntry[]> {
  return call("git_stash_list", { cwd });
}

export function gitStashPush(cwd: string, message?: string): Promise<void> {
  return call("git_stash_push", { cwd, message });
}

export function gitStashPop(cwd: string, index?: number): Promise<void> {
  return call("git_stash_pop", { cwd, index });
}

export function gitStashDrop(cwd: string, index?: number): Promise<void> {
  return call("git_stash_drop", { cwd, index });
}

export function gitTags(cwd: string): Promise<GitTag[]> {
  return call("git_tags", { cwd });
}

export function gitTagCreate(
  cwd: string,
  name: string,
  message?: string,
  target?: string,
): Promise<void> {
  return call("git_tag_create", { cwd, name, message, target });
}

export function gitTagDelete(cwd: string, name: string): Promise<void> {
  return call("git_tag_delete", { cwd, name });
}

export function gitRemotes(cwd: string): Promise<GitRemote[]> {
  return call("git_remotes", { cwd });
}

export function gitRemoteAdd(cwd: string, name: string, url: string): Promise<void> {
  return call("git_remote_add", { cwd, name, url });
}

export function gitRemoteRemove(cwd: string, name: string): Promise<void> {
  return call("git_remote_remove", { cwd, name });
}

export function gitRemoteRename(cwd: string, oldName: string, newName: string): Promise<void> {
  return call("git_remote_rename", { cwd, old: oldName, new: newName });
}

export function serverStatus(): Promise<ServerStatus> {
  return call("server_status");
}

export function serverStart(): Promise<ServerStatus> {
  return call("server_start");
}

export function serverStop(): Promise<ServerStatus> {
  return call("server_stop");
}

export function apiAuthStatus(): Promise<ApiAuthStatus> {
  return call("api_auth_status");
}

export function apiSetToken(token: string): Promise<void> {
  return call("api_set_token", { token });
}

export function apiClearToken(): Promise<void> {
  return call("api_clear_token");
}

export function apiUser(): Promise<UserDto> {
  return call("api_user");
}

export function userProfile(login: string): Promise<UserProfileDto> {
  return call("user_profile", { login });
}

export function userRepos(
  login: string,
  sort?: string,
  page?: number,
  perPage?: number,
): Promise<RepoDto[]> {
  return call("user_repos", { login, sort, page, perPage });
}

export function starredRepos(page?: number, perPage?: number): Promise<RepoDto[]> {
  return call("starred_repos", { page, perPage });
}

export function rateLimit(): Promise<RateLimitDto> {
  return call("rate_limit");
}

export function userEvents(login: string, page?: number, perPage?: number): Promise<EventDto[]> {
  return call("user_events", { login, page, perPage });
}

export function notifications(page?: number, perPage?: number): Promise<NotificationDto[]> {
  return call("notifications", { page, perPage });
}

export function notificationMarkRead(id: string): Promise<void> {
  return call("notification_mark_read", { id });
}

export function searchRepos(query: string, page?: number, perPage?: number): Promise<RepoDto[]> {
  return call("search_repos", { query, page, perPage });
}

export function searchUsers(
  query: string,
  page?: number,
  perPage?: number,
): Promise<UserProfileDto[]> {
  return call("search_users", { query, page, perPage });
}

export function searchCode(
  query: string,
  page?: number,
  perPage?: number,
): Promise<CodeSearchResultDto[]> {
  return call("search_code", { query, page, perPage });
}

export function repoDetail(repo: string): Promise<RepoDto> {
  return call("repo_detail", { repo });
}

export function branches(repo: string): Promise<string[]> {
  return call("branches", { repo });
}

export function repoTree(repo: string, gitRef?: string): Promise<TreeNodeDto[]> {
  return call("repo_tree", { repo, gitRef });
}

export function fileContent(repo: string, path: string, gitRef?: string): Promise<ContentDto> {
  return call("file_content", { repo, path, gitRef });
}

export function recentCommits(
  repo: string,
  gitRef?: string,
  perPage?: number,
): Promise<CommitDto[]> {
  return call("recent_commits", { repo, gitRef, perPage });
}

export function compareBranches(repo: string, base: string, head: string): Promise<CompareDto> {
  return call("compare_branches", { repo, base, head });
}

export function repoLanguages(repo: string): Promise<LanguageDto[]> {
  return call("repo_languages", { repo });
}

export function repoContributors(repo: string, perPage?: number): Promise<ContributorDto[]> {
  return call("repo_contributors", { repo, perPage });
}

export function issues(repo: string, state?: string, perPage?: number): Promise<IssueDto[]> {
  return call("issues", { repo, state, perPage });
}

export function issue(repo: string, number: number): Promise<IssueDto> {
  return call("issue", { repo, number });
}

export function issueComments(repo: string, number: number): Promise<IssueCommentDto[]> {
  return call("issue_comments", { repo, number });
}

export function commentIssue(repo: string, number: number, body: string): Promise<IssueCommentDto> {
  return call("comment_issue", { repo, number, body });
}

export function createIssue(repo: string, title: string, body?: string): Promise<IssueDto> {
  return call("create_issue", { repo, title, body });
}

export function closeIssue(repo: string, number: number): Promise<IssueDto> {
  return call("close_issue", { repo, number });
}

export function reopenIssue(repo: string, number: number): Promise<IssueDto> {
  return call("reopen_issue", { repo, number });
}

export function pullRequests(
  repo: string,
  state?: string,
  perPage?: number,
): Promise<PrSummaryDto[]> {
  return call("pull_requests", { repo, state, perPage });
}

export function pullRequest(repo: string, number: number): Promise<PrDetailDto> {
  return call("pull_request", { repo, number });
}

export function prFiles(repo: string, number: number): Promise<DiffFileDto[]> {
  return call("pr_files", { repo, number });
}

export function pullRequestCommits(repo: string, number: number): Promise<CommitDto[]> {
  return call("pull_request_commits", { repo, number });
}

export function pullRequestReviews(repo: string, number: number): Promise<PrReviewDto[]> {
  return call("pull_request_reviews", { repo, number });
}

export function pullRequestComments(repo: string, number: number): Promise<PrCommentDto[]> {
  return call("pull_request_comments", { repo, number });
}

export function prConversation(repo: string, number: number): Promise<IssueCommentDto[]> {
  return call("pr_conversation", { repo, number });
}

export function createPullRequest(
  repo: string,
  title: string,
  head: string,
  base: string,
  body?: string,
): Promise<PrDetailDto> {
  return call("create_pull_request", { repo, title, head, base, body });
}

export function mergePullRequest(
  repo: string,
  number: number,
  commitTitle?: string,
  method?: string,
): Promise<MergeResultDto> {
  return call("merge_pull_request", { repo, number, commitTitle, method });
}

export function updatePullRequest(repo: string, number: number, state: string): Promise<void> {
  return call("update_pull_request", { repo, number, state });
}

export function reviewPullRequest(
  repo: string,
  number: number,
  event: string,
  body?: string,
): Promise<void> {
  return call("review_pull_request", { repo, number, event, body });
}

export function commentPullRequest(repo: string, number: number, body: string): Promise<void> {
  return call("comment_pull_request", { repo, number, body });
}

export function releases(repo: string, perPage?: number): Promise<ReleaseDto[]> {
  return call("releases", { repo, perPage });
}

export function createRelease(
  repo: string,
  tagName: string,
  name?: string,
  body?: string,
  prerelease?: boolean,
): Promise<ReleaseDto> {
  return call("create_release", { repo, tagName, name, body, prerelease });
}

export function checkRuns(repo: string, gitRef: string): Promise<CheckRunDto[]> {
  return call("check_runs", { repo, gitRef });
}

export function workflowRuns(
  repo: string,
  branch?: string,
  perPage?: number,
): Promise<WorkflowRunDto[]> {
  return call("workflow_runs", { repo, branch, perPage });
}

export function createRepo(
  name: string,
  description?: string,
  isPrivate?: boolean,
): Promise<RepoDto> {
  return call("create_repo", { name, description, private: isPrivate });
}

export function openInFileManager(path: string): Promise<void> {
  return call("open_in_file_manager", { path });
}

export function openExternal(url: string): Promise<void> {
  return call("open_external", { url });
}

export async function pickDirectory(): Promise<string | null> {
  if (!isTauri()) {
    return "/mock/projects";
  }
  const { open } = await import("@tauri-apps/plugin-dialog");
  const chosen = await open({ directory: true, multiple: false });
  return typeof chosen === "string" ? chosen : null;
}

export async function onCloneProgress(
  handler: (progress: CloneProgress) => void,
): Promise<UnlistenFn> {
  if (!isTauri()) {
    return () => undefined;
  }
  const { listen } = await import("@tauri-apps/api/event");
  return listen<CloneProgress>("clone://progress", (event) => handler(event.payload));
}
