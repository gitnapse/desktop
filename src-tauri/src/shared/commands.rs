//! Cross-platform Tauri commands.
//!
//! Everything heavy (provider, auth, config, git) lives in the `gitnapse`
//! core crate; these commands are a thin bridge. They run on the async
//! runtime with `spawn_blocking` so the UI never freezes.

use gitnapse::auth::TokenSource;
use gitnapse_protocol::{
    AuthStatusDto, CheckRunDto, CommitDto, CompareDto, ContentDto, IssueDto, MergeResultDto,
    PrCommentDto, PrDetailDto, PrReviewDto, PrSummaryDto, RateLimitDto, ReleaseDto, RepoDto,
    TreeNodeDto, UserDto, WorkflowRunDto,
};
use serde::{Deserialize, Serialize};

use super::{backend, git_ops};

/// Auth status shown in the header chip.
#[derive(Serialize)]
pub struct AuthStatus {
    pub has_token: bool,
    pub source: String,
}

/// Run a blocking call off the async runtime.
async fn blocking<T, F>(job: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> anyhow::Result<T> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(job)
        .await
        .map_err(|e| e.to_string())?
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn auth_status() -> Result<AuthStatus, String> {
    let source = gitnapse::auth::token_source().map_err(|e| e.to_string())?;
    Ok(AuthStatus {
        has_token: source != TokenSource::None,
        source: source.label().to_string(),
    })
}

/// Current default clone folder from the gitnapse account config.
#[tauri::command]
pub async fn clone_dir() -> Result<String, String> {
    blocking(git_ops::configured_clone_dir).await
}

/// Persist the default clone folder in the gitnapse account config.
#[tauri::command]
pub async fn set_clone_dir(dir: String) -> Result<String, String> {
    blocking(move || git_ops::set_clone_dir(&dir)).await
}

/// Clone `owner/repo[:branch]` or a git URL into `dir` (the core resolves the
/// clone URL via the GitHub API when given an owner/name, exactly like the CLI).
/// Returns the absolute path of the clone.
#[tauri::command]
pub async fn clone_repo(spec: String, dir: String) -> Result<String, String> {
    blocking(move || git_ops::clone_repo(&spec, &dir)).await
}

// ── Remote (GitNapse API) ───────────────────────────────────────────────

/// Reachability of the GitNapse protocol server. The returned string is the
/// server version when healthy, or an error the UI shows with a hint.
#[tauri::command]
pub async fn server_status() -> Result<String, String> {
    let health = backend::server_status().await?;
    Ok(format!("{} v{}", health.status, health.version))
}

/// Run a blocking call against the GitNapse API off the async runtime.
async fn remote<T, F>(job: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(job)
        .await
        .map_err(|e| e.to_string())?
}

/// Search repositories through the GitNapse API (never GitHub directly).
#[tauri::command]
pub async fn search_repos(query: String, per_page: Option<u8>) -> Result<Vec<RepoDto>, String> {
    let api = backend::Api::connect()?;
    let per = per_page.unwrap_or(20);
    remote(move || {
        api.client()
            .search(&query, Some(1), Some(per))
            .map_err(|e| e.to_string())
    })
    .await
}

/// Repository metadata through the GitNapse API.
#[tauri::command]
pub async fn repo_detail(repo: String) -> Result<RepoDto, String> {
    let api = backend::Api::connect()?;
    remote(move || api.client().repo(&repo).map_err(|e| e.to_string())).await
}

/// Branches of a repository through the GitNapse API.
#[tauri::command]
pub async fn branches(repo: String) -> Result<Vec<String>, String> {
    let api = backend::Api::connect()?;
    remote(move || api.client().branches(&repo).map_err(|e| e.to_string())).await
}

/// Full repository tree (pre-order) through the GitNapse API.
#[tauri::command]
pub async fn repo_tree(repo: String, git_ref: Option<String>) -> Result<Vec<TreeNodeDto>, String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .tree(&repo, git_ref.as_deref())
            .map_err(|e| e.to_string())
    })
    .await
}

/// File content (base64) through the GitNapse API.
#[tauri::command]
pub async fn file_content(
    repo: String,
    path: String,
    git_ref: Option<String>,
) -> Result<ContentDto, String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .content(&repo, &path, git_ref.as_deref())
            .map_err(|e| e.to_string())
    })
    .await
}

/// Recent commits of a ref through the GitNapse API.
#[tauri::command]
pub async fn recent_commits(
    repo: String,
    git_ref: Option<String>,
    per_page: Option<u8>,
) -> Result<Vec<CommitDto>, String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .recent_commits(&repo, git_ref.as_deref(), per_page)
            .map_err(|e| e.to_string())
    })
    .await
}

/// Branch comparison through the GitNapse API.
#[tauri::command]
pub async fn compare_branches(repo: String, base: String, head: String) -> Result<CompareDto, String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .compare(&repo, &base, &head)
            .map_err(|e| e.to_string())
    })
    .await
}

/// CI check runs for a ref through the GitNapse API.
#[tauri::command]
pub async fn check_runs(repo: String, git_ref: String) -> Result<Vec<CheckRunDto>, String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .check_runs(&repo, &git_ref)
            .map_err(|e| e.to_string())
    })
    .await
}

/// Workflow runs through the GitNapse API.
#[tauri::command]
pub async fn workflow_runs(
    repo: String,
    branch: Option<String>,
    per_page: Option<u8>,
) -> Result<Vec<WorkflowRunDto>, String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .workflow_runs(&repo, branch.as_deref(), per_page)
            .map_err(|e| e.to_string())
    })
    .await
}

/// Issues of a repository through the GitNapse API.
#[tauri::command]
pub async fn issues(
    repo: String,
    state: Option<String>,
    per_page: Option<u8>,
) -> Result<Vec<IssueDto>, String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .issues(&repo, state.as_deref(), per_page)
            .map_err(|e| e.to_string())
    })
    .await
}

/// Create an issue through the GitNapse API.
#[tauri::command]
pub async fn create_issue(repo: String, title: String, body: Option<String>) -> Result<IssueDto, String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .create_issue(&repo, &title, body.as_deref())
            .map_err(|e| e.to_string())
    })
    .await
}

/// Close an issue through the GitNapse API.
#[tauri::command]
pub async fn close_issue(repo: String, number: u64) -> Result<IssueDto, String> {
    let api = backend::Api::connect()?;
    remote(move || api.client().close_issue(&repo, number).map_err(|e| e.to_string())).await
}

/// Pull requests through the GitNapse API.
#[tauri::command]
pub async fn pull_requests(
    repo: String,
    state: Option<String>,
    per_page: Option<u8>,
) -> Result<Vec<PrSummaryDto>, String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .pull_requests(&repo, state.as_deref(), per_page)
            .map_err(|e| e.to_string())
    })
    .await
}

/// Pull request detail through the GitNapse API.
#[tauri::command]
pub async fn pull_request(repo: String, number: u64) -> Result<PrDetailDto, String> {
    let api = backend::Api::connect()?;
    remote(move || api.client().pull_request(&repo, number).map_err(|e| e.to_string())).await
}

/// Open a pull request through the GitNapse API.
#[tauri::command]
pub async fn create_pull_request(
    repo: String,
    title: String,
    head: String,
    base: String,
    body: Option<String>,
) -> Result<PrDetailDto, String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .create_pull_request(&repo, &title, &head, &base, body.as_deref())
            .map_err(|e| e.to_string())
    })
    .await
}

/// Merge a pull request through the GitNapse API.
#[tauri::command]
pub async fn merge_pull_request(
    repo: String,
    number: u64,
    commit_title: Option<String>,
    method: Option<String>,
) -> Result<MergeResultDto, String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .merge_pull_request(&repo, number, commit_title.as_deref(), method.as_deref())
            .map_err(|e| e.to_string())
    })
    .await
}

/// Open/close a pull request through the GitNapse API.
#[tauri::command]
pub async fn update_pull_request(repo: String, number: u64, state: String) -> Result<(), String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .update_pull_request(&repo, number, &state)
            .map_err(|e| e.to_string())
    })
    .await
}

/// PR reviews through the GitNapse API.
#[tauri::command]
pub async fn pull_request_reviews(repo: String, number: u64) -> Result<Vec<PrReviewDto>, String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .pull_request_reviews(&repo, number)
            .map_err(|e| e.to_string())
    })
    .await
}

/// Submit a PR review (approve/request_changes/comment) through the API.
#[tauri::command]
pub async fn review_pull_request(
    repo: String,
    number: u64,
    event: String,
    body: Option<String>,
) -> Result<(), String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .review_pull_request(&repo, number, &event, body.as_deref())
            .map_err(|e| e.to_string())
    })
    .await
}

/// PR comments through the GitNapse API.
#[tauri::command]
pub async fn pull_request_comments(repo: String, number: u64) -> Result<Vec<PrCommentDto>, String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .pull_request_comments(&repo, number)
            .map_err(|e| e.to_string())
    })
    .await
}

/// Comment on a PR through the GitNapse API.
#[tauri::command]
pub async fn comment_pull_request(repo: String, number: u64, body: String) -> Result<(), String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .comment_pull_request(&repo, number, &body)
            .map_err(|e| e.to_string())
    })
    .await
}

/// PR commits through the GitNapse API.
#[tauri::command]
pub async fn pull_request_commits(repo: String, number: u64) -> Result<Vec<CommitDto>, String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .pull_request_commits(&repo, number)
            .map_err(|e| e.to_string())
    })
    .await
}

/// Releases through the GitNapse API.
#[tauri::command]
pub async fn releases(repo: String, per_page: Option<u8>) -> Result<Vec<ReleaseDto>, String> {
    let api = backend::Api::connect()?;
    remote(move || api.client().releases(&repo, per_page).map_err(|e| e.to_string())).await
}

/// Create a release through the GitNapse API.
#[tauri::command]
pub async fn create_release(
    repo: String,
    tag_name: String,
    name: Option<String>,
    body: Option<String>,
    prerelease: bool,
) -> Result<ReleaseDto, String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .create_release(&repo, &tag_name, name.as_deref(), body.as_deref(), prerelease)
            .map_err(|e| e.to_string())
    })
    .await
}

/// Create a repository through the GitNapse API.
#[tauri::command]
pub async fn create_repo(
    name: String,
    description: Option<String>,
    private: bool,
) -> Result<RepoDto, String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .create_repo(&name, description.as_deref(), private)
            .map_err(|e| e.to_string())
    })
    .await
}

/// Authenticated user through the GitNapse API.
#[tauri::command]
pub async fn api_user() -> Result<UserDto, String> {
    let api = backend::Api::connect()?;
    remote(move || api.client().user().map_err(|e| e.to_string())).await
}

/// Starred repositories through the GitNapse API.
#[tauri::command]
pub async fn starred_repos(page: Option<u32>, per_page: Option<u8>) -> Result<Vec<RepoDto>, String> {
    let api = backend::Api::connect()?;
    remote(move || {
        api.client()
            .starred_repos(page, per_page)
            .map_err(|e| e.to_string())
    })
    .await
}

/// GitHub rate-limit headers through the GitNapse API.
#[tauri::command]
pub async fn rate_limit() -> Result<RateLimitDto, String> {
    let api = backend::Api::connect()?;
    remote(move || api.client().rate_limit().map_err(|e| e.to_string())).await
}

/// Auth status of the server (token source) through the GitNapse API.
#[tauri::command]
pub async fn api_auth_status() -> Result<AuthStatusDto, String> {
    let api = backend::Api::connect()?;
    remote(move || api.client().auth_status().map_err(|e| e.to_string())).await
}

/// Set the server token through the GitNapse API (validated server-side).
#[tauri::command]
pub async fn api_set_token(token: String) -> Result<(), String> {
    let api = backend::Api::connect()?;
    remote(move || api.client().set_token(&token).map_err(|e| e.to_string())).await
}

/// Clear the server token through the GitNapse API.
#[tauri::command]
pub async fn api_clear_token() -> Result<(), String> {
    let api = backend::Api::connect()?;
    remote(move || api.client().clear_token().map_err(|e| e.to_string())).await
}

// ── Local git (passthrough over the gitnapse helpers, cwd-scoped) ───────

/// Arguments for `git_raw`.
#[derive(Deserialize)]
pub struct GitRawArgs {
    /// Working directory of the repository (default: current process cwd).
    pub cwd: Option<String>,
    pub args: Vec<String>,
}

/// Run an arbitrary git command inside a repository folder. This is the escape
/// hatch for the UI; the core CLI functions remain the canonical high-level
/// wrappers. Output is raw stdout (trimmed), errors surface stderr.
#[tauri::command]
pub async fn git_raw(args: GitRawArgs) -> Result<String, String> {
    tauri::async_runtime::spawn_blocking(move || {
        use gitnapse::cli::helpers as h;
        h::check_git().map_err(|e| e.to_string())?;
        let out = match args.cwd {
            Some(cwd) => h::run_git_with_cwd(&to_refs(&args.args), std::path::Path::new(&cwd)),
            None => h::run_git(&to_refs(&args.args)),
        }
        .map_err(|e| e.to_string())?;
        if !out.status.success() {
            return Err(h::stderr_msg(&out));
        }
        Ok(h::stdout_str(&out).trim_end().to_string())
    })
    .await
    .map_err(|e| e.to_string())?
}

fn to_refs(values: &[String]) -> Vec<&str> {
    values.iter().map(String::as_str).collect()
}
