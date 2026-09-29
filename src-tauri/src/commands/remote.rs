//! Remote commands: server sidecar lifecycle + GitHub data through the
//! GitNapse HTTP API (`gitnapse-client`, one shared client in [`AppState`]).

use super::blocking;
use crate::AppState;
use gitnapse_bridge::dto::{
    AuthStatusDto, CheckRunDto, CodeSearchResultDto, CommitDto, CompareDto, ContentDto,
    ContributorDto, DiffFileDto, EventDto, IssueCommentDto, IssueDto, LanguageDto, MergeResultDto,
    NotificationDto, PrCommentDto, PrDetailDto, PrReviewDto, PrSummaryDto, RateLimitDto,
    ReleaseDto, RepoDto, ServerStatus, TreeNodeDto, UserDto, UserProfileDto, WorkflowRunDto,
};
use tauri::State;

// ── Server lifecycle ─────────────────────────────────────────────────────

/// Health/ownership of the local `gitnapse-server` sidecar.
#[tauri::command]
pub async fn server_status(state: State<'_, AppState>) -> Result<ServerStatus, String> {
    let server = state.server();
    blocking(move || {
        let mut manager = server
            .lock()
            .map_err(|_| "server lock poisoned".to_string())?;
        Ok::<ServerStatus, String>(manager.status())
    })
    .await
}

/// Ensures the sidecar is running (spawns and health-checks it when absent).
#[tauri::command]
pub async fn server_start(state: State<'_, AppState>) -> Result<ServerStatus, String> {
    let server = state.server();
    blocking(move || {
        let mut manager = server
            .lock()
            .map_err(|_| "server lock poisoned".to_string())?;
        manager.ensure_running().map_err(|error| error.to_string())
    })
    .await
}

/// Stops the sidecar — only when this app spawned it.
#[tauri::command]
pub async fn server_stop(state: State<'_, AppState>) -> Result<ServerStatus, String> {
    let server = state.server();
    blocking(move || {
        let mut manager = server
            .lock()
            .map_err(|_| "server lock poisoned".to_string())?;
        Ok::<ServerStatus, String>(manager.stop())
    })
    .await
}

// ── Protocol auth ────────────────────────────────────────────────────────

/// Token status as seen by the server.
#[tauri::command]
pub async fn api_auth_status(state: State<'_, AppState>) -> Result<AuthStatusDto, String> {
    state
        .api()?
        .auth_status()
        .await
        .map_err(|error| error.to_string())
}

/// Stores and activates a token on the server (validated server-side).
#[tauri::command]
pub async fn api_set_token(state: State<'_, AppState>, token: String) -> Result<(), String> {
    state
        .api()?
        .set_token(&token)
        .await
        .map_err(|error| error.to_string())
}

/// Clears the server token.
#[tauri::command]
pub async fn api_clear_token(state: State<'_, AppState>) -> Result<(), String> {
    state
        .api()?
        .clear_token()
        .await
        .map_err(|error| error.to_string())
}

// ── User / profile / activity ────────────────────────────────────────────

/// Authenticated login.
#[tauri::command]
pub async fn api_user(state: State<'_, AppState>) -> Result<UserDto, String> {
    state.api()?.user().await.map_err(|error| error.to_string())
}

/// Public profile of a GitHub user.
#[tauri::command]
pub async fn user_profile(
    state: State<'_, AppState>,
    login: String,
) -> Result<UserProfileDto, String> {
    state
        .api()?
        .user_profile(&login)
        .await
        .map_err(|error| error.to_string())
}

/// Public repositories of a user.
#[tauri::command]
pub async fn user_repos(
    state: State<'_, AppState>,
    login: String,
    sort: Option<String>,
    page: Option<u32>,
    per_page: Option<u8>,
) -> Result<Vec<RepoDto>, String> {
    state
        .api()?
        .user_repos(&login, sort.as_deref(), page, per_page)
        .await
        .map_err(|error| error.to_string())
}

/// Repositories starred by the authenticated user.
#[tauri::command]
pub async fn starred_repos(
    state: State<'_, AppState>,
    page: Option<u32>,
    per_page: Option<u8>,
) -> Result<Vec<RepoDto>, String> {
    state
        .api()?
        .starred_repos(page, per_page)
        .await
        .map_err(|error| error.to_string())
}

/// Last known GitHub rate-limit headers.
#[tauri::command]
pub async fn rate_limit(state: State<'_, AppState>) -> Result<RateLimitDto, String> {
    state
        .api()?
        .rate_limit()
        .await
        .map_err(|error| error.to_string())
}

/// Public activity feed of a user.
#[tauri::command]
pub async fn user_events(
    state: State<'_, AppState>,
    login: String,
    page: Option<u32>,
    per_page: Option<u8>,
) -> Result<Vec<EventDto>, String> {
    state
        .api()?
        .user_events(&login, page, per_page)
        .await
        .map_err(|error| error.to_string())
}

/// Authenticated user's notifications inbox.
#[tauri::command]
pub async fn notifications(
    state: State<'_, AppState>,
    page: Option<u32>,
    per_page: Option<u8>,
) -> Result<Vec<NotificationDto>, String> {
    state
        .api()?
        .notifications(page, per_page)
        .await
        .map_err(|error| error.to_string())
}

/// Marks a notification thread as read.
#[tauri::command]
pub async fn notification_mark_read(state: State<'_, AppState>, id: String) -> Result<(), String> {
    state
        .api()?
        .notification_mark_read(&id)
        .await
        .map_err(|error| error.to_string())
}

// ── Search ───────────────────────────────────────────────────────────────

/// Searches repositories.
#[tauri::command]
pub async fn search_repos(
    state: State<'_, AppState>,
    query: String,
    page: Option<u32>,
    per_page: Option<u8>,
) -> Result<Vec<RepoDto>, String> {
    state
        .api()?
        .search(&query, page, per_page)
        .await
        .map_err(|error| error.to_string())
}

/// Searches GitHub users.
#[tauri::command]
pub async fn search_users(
    state: State<'_, AppState>,
    query: String,
    page: Option<u32>,
    per_page: Option<u8>,
) -> Result<Vec<UserProfileDto>, String> {
    state
        .api()?
        .search_users(&query, page, per_page)
        .await
        .map_err(|error| error.to_string())
}

/// Searches code across GitHub.
#[tauri::command]
pub async fn search_code(
    state: State<'_, AppState>,
    query: String,
    page: Option<u32>,
    per_page: Option<u8>,
) -> Result<Vec<CodeSearchResultDto>, String> {
    state
        .api()?
        .search_code(&query, page, per_page)
        .await
        .map_err(|error| error.to_string())
}

// ── Repositories ─────────────────────────────────────────────────────────

/// Repository metadata.
#[tauri::command]
pub async fn repo_detail(state: State<'_, AppState>, repo: String) -> Result<RepoDto, String> {
    state
        .api()?
        .repo(&repo)
        .await
        .map_err(|error| error.to_string())
}

/// Branch names.
#[tauri::command]
pub async fn branches(state: State<'_, AppState>, repo: String) -> Result<Vec<String>, String> {
    state
        .api()?
        .branches(&repo)
        .await
        .map_err(|error| error.to_string())
}

/// Full repository tree for a ref.
#[tauri::command]
pub async fn repo_tree(
    state: State<'_, AppState>,
    repo: String,
    git_ref: Option<String>,
) -> Result<Vec<TreeNodeDto>, String> {
    state
        .api()?
        .tree(&repo, git_ref.as_deref())
        .await
        .map_err(|error| error.to_string())
}

/// File content (base64) for a ref.
#[tauri::command]
pub async fn file_content(
    state: State<'_, AppState>,
    repo: String,
    path: String,
    git_ref: Option<String>,
) -> Result<ContentDto, String> {
    state
        .api()?
        .content(&repo, &path, git_ref.as_deref())
        .await
        .map_err(|error| error.to_string())
}

/// Recent commits of a ref.
#[tauri::command]
pub async fn recent_commits(
    state: State<'_, AppState>,
    repo: String,
    git_ref: Option<String>,
    per_page: Option<u8>,
) -> Result<Vec<CommitDto>, String> {
    state
        .api()?
        .recent_commits(&repo, git_ref.as_deref(), per_page)
        .await
        .map_err(|error| error.to_string())
}

/// Ahead/behind comparison between two refs.
#[tauri::command]
pub async fn compare_branches(
    state: State<'_, AppState>,
    repo: String,
    base: String,
    head: String,
) -> Result<CompareDto, String> {
    state
        .api()?
        .compare(&repo, &base, &head)
        .await
        .map_err(|error| error.to_string())
}

/// Language breakdown by bytes.
#[tauri::command]
pub async fn repo_languages(
    state: State<'_, AppState>,
    repo: String,
) -> Result<Vec<LanguageDto>, String> {
    state
        .api()?
        .languages(&repo)
        .await
        .map_err(|error| error.to_string())
}

/// Repository contributors.
#[tauri::command]
pub async fn repo_contributors(
    state: State<'_, AppState>,
    repo: String,
    per_page: Option<u8>,
) -> Result<Vec<ContributorDto>, String> {
    state
        .api()?
        .contributors(&repo, per_page)
        .await
        .map_err(|error| error.to_string())
}

// ── Issues ───────────────────────────────────────────────────────────────

/// Lists issues (`state`: open|closed|all).
#[tauri::command]
pub async fn issues(
    app: State<'_, AppState>,
    repo: String,
    state: Option<String>,
    per_page: Option<u8>,
) -> Result<Vec<IssueDto>, String> {
    app.api()?
        .issues(&repo, state.as_deref(), per_page)
        .await
        .map_err(|error| error.to_string())
}

/// Full detail of a single issue.
#[tauri::command]
pub async fn issue(
    state: State<'_, AppState>,
    repo: String,
    number: u64,
) -> Result<IssueDto, String> {
    state
        .api()?
        .issue_detail(&repo, number)
        .await
        .map_err(|error| error.to_string())
}

/// Conversation comments of an issue.
#[tauri::command]
pub async fn issue_comments(
    state: State<'_, AppState>,
    repo: String,
    number: u64,
) -> Result<Vec<IssueCommentDto>, String> {
    state
        .api()?
        .issue_comments(&repo, number)
        .await
        .map_err(|error| error.to_string())
}

/// Comments on an issue.
#[tauri::command]
pub async fn comment_issue(
    state: State<'_, AppState>,
    repo: String,
    number: u64,
    body: String,
) -> Result<IssueCommentDto, String> {
    state
        .api()?
        .create_issue_comment(&repo, number, &body)
        .await
        .map_err(|error| error.to_string())
}

/// Creates an issue.
#[tauri::command]
pub async fn create_issue(
    state: State<'_, AppState>,
    repo: String,
    title: String,
    body: Option<String>,
) -> Result<IssueDto, String> {
    state
        .api()?
        .create_issue(&repo, &title, body.as_deref())
        .await
        .map_err(|error| error.to_string())
}

/// Closes an issue.
#[tauri::command]
pub async fn close_issue(
    state: State<'_, AppState>,
    repo: String,
    number: u64,
) -> Result<IssueDto, String> {
    state
        .api()?
        .close_issue(&repo, number)
        .await
        .map_err(|error| error.to_string())
}

/// Reopens a closed issue.
#[tauri::command]
pub async fn reopen_issue(
    state: State<'_, AppState>,
    repo: String,
    number: u64,
) -> Result<IssueDto, String> {
    state
        .api()?
        .reopen_issue(&repo, number)
        .await
        .map_err(|error| error.to_string())
}

// ── Pull requests ────────────────────────────────────────────────────────

/// Lists pull requests (`state`: open|closed|all).
#[tauri::command]
pub async fn pull_requests(
    app: State<'_, AppState>,
    repo: String,
    state: Option<String>,
    per_page: Option<u8>,
) -> Result<Vec<PrSummaryDto>, String> {
    app.api()?
        .pull_requests(&repo, state.as_deref(), per_page)
        .await
        .map_err(|error| error.to_string())
}

/// Full pull request detail.
#[tauri::command]
pub async fn pull_request(
    state: State<'_, AppState>,
    repo: String,
    number: u64,
) -> Result<PrDetailDto, String> {
    state
        .api()?
        .pull_request(&repo, number)
        .await
        .map_err(|error| error.to_string())
}

/// Files changed by a pull request.
#[tauri::command]
pub async fn pr_files(
    state: State<'_, AppState>,
    repo: String,
    number: u64,
) -> Result<Vec<DiffFileDto>, String> {
    state
        .api()?
        .pr_files(&repo, number)
        .await
        .map_err(|error| error.to_string())
}

/// Commits of a pull request.
#[tauri::command]
pub async fn pull_request_commits(
    state: State<'_, AppState>,
    repo: String,
    number: u64,
) -> Result<Vec<CommitDto>, String> {
    state
        .api()?
        .pull_request_commits(&repo, number)
        .await
        .map_err(|error| error.to_string())
}

/// Reviews submitted on a pull request.
#[tauri::command]
pub async fn pull_request_reviews(
    state: State<'_, AppState>,
    repo: String,
    number: u64,
) -> Result<Vec<PrReviewDto>, String> {
    state
        .api()?
        .pull_request_reviews(&repo, number)
        .await
        .map_err(|error| error.to_string())
}

/// Inline review comments.
#[tauri::command]
pub async fn pull_request_comments(
    state: State<'_, AppState>,
    repo: String,
    number: u64,
) -> Result<Vec<PrCommentDto>, String> {
    state
        .api()?
        .pull_request_comments(&repo, number)
        .await
        .map_err(|error| error.to_string())
}

/// Conversation comments of a pull request.
#[tauri::command]
pub async fn pr_conversation(
    state: State<'_, AppState>,
    repo: String,
    number: u64,
) -> Result<Vec<IssueCommentDto>, String> {
    state
        .api()?
        .pr_conversation(&repo, number)
        .await
        .map_err(|error| error.to_string())
}

/// Opens a pull request.
#[tauri::command]
pub async fn create_pull_request(
    state: State<'_, AppState>,
    repo: String,
    title: String,
    head: String,
    base: String,
    body: Option<String>,
) -> Result<PrDetailDto, String> {
    state
        .api()?
        .create_pull_request(&repo, &title, &head, &base, body.as_deref())
        .await
        .map_err(|error| error.to_string())
}

/// Merges a pull request (`method`: merge|squash|rebase).
#[tauri::command]
pub async fn merge_pull_request(
    state: State<'_, AppState>,
    repo: String,
    number: u64,
    commit_title: Option<String>,
    method: Option<String>,
) -> Result<MergeResultDto, String> {
    state
        .api()?
        .merge_pull_request(&repo, number, commit_title.as_deref(), method.as_deref())
        .await
        .map_err(|error| error.to_string())
}

/// Opens or closes a pull request (`state`: open|closed).
#[tauri::command]
pub async fn update_pull_request(
    app: State<'_, AppState>,
    repo: String,
    number: u64,
    state: String,
) -> Result<(), String> {
    app.api()?
        .update_pull_request(&repo, number, &state)
        .await
        .map_err(|error| error.to_string())
}

/// Approves / requests changes / comments on a pull request.
#[tauri::command]
pub async fn review_pull_request(
    state: State<'_, AppState>,
    repo: String,
    number: u64,
    event: String,
    body: Option<String>,
) -> Result<(), String> {
    state
        .api()?
        .review_pull_request(&repo, number, &event, body.as_deref())
        .await
        .map_err(|error| error.to_string())
}

/// Comments on a pull request.
#[tauri::command]
pub async fn comment_pull_request(
    state: State<'_, AppState>,
    repo: String,
    number: u64,
    body: String,
) -> Result<(), String> {
    state
        .api()?
        .comment_pull_request(&repo, number, &body)
        .await
        .map_err(|error| error.to_string())
}

// ── Releases / actions / repos ───────────────────────────────────────────

/// Releases of a repository.
#[tauri::command]
pub async fn releases(
    state: State<'_, AppState>,
    repo: String,
    per_page: Option<u8>,
) -> Result<Vec<ReleaseDto>, String> {
    state
        .api()?
        .releases(&repo, per_page)
        .await
        .map_err(|error| error.to_string())
}

/// Creates a release from an existing tag.
#[tauri::command]
pub async fn create_release(
    state: State<'_, AppState>,
    repo: String,
    tag_name: String,
    name: Option<String>,
    body: Option<String>,
    prerelease: Option<bool>,
) -> Result<ReleaseDto, String> {
    state
        .api()?
        .create_release(
            &repo,
            &tag_name,
            name.as_deref(),
            body.as_deref(),
            prerelease.unwrap_or(false),
        )
        .await
        .map_err(|error| error.to_string())
}

/// Check runs for a ref.
#[tauri::command]
pub async fn check_runs(
    state: State<'_, AppState>,
    repo: String,
    git_ref: String,
) -> Result<Vec<CheckRunDto>, String> {
    state
        .api()?
        .check_runs(&repo, &git_ref)
        .await
        .map_err(|error| error.to_string())
}

/// Workflow runs, optionally filtered by branch.
#[tauri::command]
pub async fn workflow_runs(
    state: State<'_, AppState>,
    repo: String,
    branch: Option<String>,
    per_page: Option<u8>,
) -> Result<Vec<WorkflowRunDto>, String> {
    state
        .api()?
        .workflow_runs(&repo, branch.as_deref(), per_page)
        .await
        .map_err(|error| error.to_string())
}

/// Creates a repository for the authenticated user.
#[tauri::command]
pub async fn create_repo(
    state: State<'_, AppState>,
    name: String,
    description: Option<String>,
    private: Option<bool>,
) -> Result<RepoDto, String> {
    state
        .api()?
        .create_repo(&name, description.as_deref(), private.unwrap_or(false))
        .await
        .map_err(|error| error.to_string())
}
