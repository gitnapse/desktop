//! Typed async wrapper over [`gitnapse_client::Client`].
//!
//! One method per remote Tauri command in the frozen contract; the frontend
//! never talks to GitHub directly. The wrapper is cheap to clone (the inner
//! client holds a pooled `reqwest::Client`).

use anyhow::{Context, Result};
use gitnapse_protocol::{
    AuthStatusDto, CheckRunDto, CodeSearchResultDto, CommitDto, CompareDto, ContentDto,
    ContributorDto, EventDto, HealthDto, IssueCommentDto, IssueDto, LanguageDto, MergeResultDto,
    NotificationDto, PrCommentDto, PrDetailDto, PrReviewDto, PrSummaryDto, RateLimitDto,
    ReleaseDto, RepoDto, TreeNodeDto, UserDto, UserProfileDto, WorkflowRunDto,
};

/// Client for a running `gitnapse-server`.
#[derive(Debug, Clone)]
pub struct ApiClient {
    client: gitnapse_client::Client,
    base_url: String,
}

impl ApiClient {
    /// Points at the base URL of a `gitnapse-server`
    /// (e.g. `http://127.0.0.1:8787`).
    pub fn new(base_url: &str) -> Result<Self> {
        let client = gitnapse_client::Client::new(base_url)
            .with_context(|| format!("invalid GitNapse server URL: {base_url}"))?;
        Ok(Self {
            client,
            base_url: base_url.to_string(),
        })
    }

    /// Base URL this client talks to.
    pub fn base_url(&self) -> &str {
        &self.base_url
    }

    // ── Infrastructure / auth ────────────────────────────────────────────

    /// `GET /health`.
    pub async fn health(&self) -> Result<HealthDto> {
        Ok(self.client.health().await?)
    }

    /// `GET /api/v1/auth/status` — token state of the server.
    pub async fn auth_status(&self) -> Result<AuthStatusDto> {
        Ok(self.client.auth_status().await?)
    }

    /// `POST /api/v1/auth/token` — validate, store and activate a token.
    pub async fn set_token(&self, token: &str) -> Result<()> {
        Ok(self.client.set_token(token).await?)
    }

    /// `DELETE /api/v1/auth/token` — forget the stored token.
    pub async fn clear_token(&self) -> Result<()> {
        Ok(self.client.clear_token().await?)
    }

    // ── Identity / discovery ─────────────────────────────────────────────

    /// `GET /api/v1/user` — authenticated login.
    pub async fn user(&self) -> Result<UserDto> {
        Ok(self.client.user().await?)
    }

    /// `GET /api/v1/user/starred`.
    pub async fn starred_repos(
        &self,
        page: Option<u32>,
        per_page: Option<u8>,
    ) -> Result<Vec<RepoDto>> {
        Ok(self.client.starred_repos(page, per_page).await?)
    }

    /// `GET /api/v1/rate-limit`.
    pub async fn rate_limit(&self) -> Result<RateLimitDto> {
        Ok(self.client.rate_limit().await?)
    }

    /// `GET /api/v1/users/profile`.
    pub async fn user_profile(&self, login: &str) -> Result<UserProfileDto> {
        Ok(self.client.user_profile(login).await?)
    }

    /// `GET /api/v1/users/repos`.
    pub async fn user_repos(
        &self,
        login: &str,
        sort: Option<&str>,
        page: Option<u32>,
        per_page: Option<u8>,
    ) -> Result<Vec<RepoDto>> {
        Ok(self.client.user_repos(login, sort, page, per_page).await?)
    }

    /// `GET /api/v1/users/events`.
    pub async fn user_events(
        &self,
        login: &str,
        page: Option<u32>,
        per_page: Option<u8>,
    ) -> Result<Vec<EventDto>> {
        Ok(self.client.user_events(login, page, per_page).await?)
    }

    /// `GET /api/v1/users/notifications`.
    pub async fn notifications(
        &self,
        page: Option<u32>,
        per_page: Option<u8>,
    ) -> Result<Vec<NotificationDto>> {
        Ok(self.client.notifications(page, per_page).await?)
    }

    /// `POST /api/v1/users/notifications/read`.
    pub async fn notification_mark_read(&self, id: &str) -> Result<()> {
        Ok(self.client.notification_mark_read(id).await?)
    }

    // ── Search ───────────────────────────────────────────────────────────

    /// `GET /api/v1/search` — repository search.
    pub async fn search(
        &self,
        query: &str,
        page: Option<u32>,
        per_page: Option<u8>,
    ) -> Result<Vec<RepoDto>> {
        Ok(self.client.search(query, page, per_page).await?)
    }

    /// `GET /api/v1/search/users`.
    pub async fn search_users(
        &self,
        query: &str,
        page: Option<u32>,
        per_page: Option<u8>,
    ) -> Result<Vec<UserProfileDto>> {
        Ok(self.client.search_users(query, page, per_page).await?)
    }

    /// `GET /api/v1/search/code`.
    pub async fn search_code(
        &self,
        query: &str,
        page: Option<u32>,
        per_page: Option<u8>,
    ) -> Result<Vec<CodeSearchResultDto>> {
        Ok(self.client.search_code(query, page, per_page).await?)
    }

    // ── Repositories ─────────────────────────────────────────────────────

    /// `GET /api/v1/repos/detail`.
    pub async fn repo(&self, repo: &str) -> Result<RepoDto> {
        Ok(self.client.repo(repo).await?)
    }

    /// `GET /api/v1/repos/branches`.
    pub async fn branches(&self, repo: &str) -> Result<Vec<String>> {
        Ok(self.client.branches(repo).await?)
    }

    /// `GET /api/v1/repos/tree`.
    pub async fn tree(&self, repo: &str, git_ref: Option<&str>) -> Result<Vec<TreeNodeDto>> {
        Ok(self.client.tree(repo, git_ref).await?)
    }

    /// `GET /api/v1/repos/content` (base64 content).
    pub async fn content(
        &self,
        repo: &str,
        path: &str,
        git_ref: Option<&str>,
    ) -> Result<ContentDto> {
        Ok(self.client.content(repo, path, git_ref).await?)
    }

    /// `GET /api/v1/repos/languages`.
    pub async fn languages(&self, repo: &str) -> Result<Vec<LanguageDto>> {
        Ok(self.client.languages(repo).await?)
    }

    /// `GET /api/v1/repos/contributors`.
    pub async fn contributors(
        &self,
        repo: &str,
        per_page: Option<u8>,
    ) -> Result<Vec<ContributorDto>> {
        Ok(self.client.contributors(repo, per_page).await?)
    }

    /// `GET /api/v1/commits`.
    pub async fn recent_commits(
        &self,
        repo: &str,
        git_ref: Option<&str>,
        per_page: Option<u8>,
    ) -> Result<Vec<CommitDto>> {
        Ok(self.client.recent_commits(repo, git_ref, per_page).await?)
    }

    /// `GET /api/v1/compare`.
    pub async fn compare(&self, repo: &str, base: &str, head: &str) -> Result<CompareDto> {
        Ok(self.client.compare(repo, base, head).await?)
    }

    /// `GET /api/v1/checks`.
    pub async fn check_runs(&self, repo: &str, git_ref: &str) -> Result<Vec<CheckRunDto>> {
        Ok(self.client.check_runs(repo, git_ref).await?)
    }

    /// `GET /api/v1/workflows`.
    pub async fn workflow_runs(
        &self,
        repo: &str,
        branch: Option<&str>,
        per_page: Option<u8>,
    ) -> Result<Vec<WorkflowRunDto>> {
        Ok(self.client.workflow_runs(repo, branch, per_page).await?)
    }

    // ── Issues ───────────────────────────────────────────────────────────

    /// `GET /api/v1/issues`.
    pub async fn issues(
        &self,
        repo: &str,
        state: Option<&str>,
        per_page: Option<u8>,
    ) -> Result<Vec<IssueDto>> {
        Ok(self.client.issues(repo, state, per_page).await?)
    }

    /// `GET /api/v1/issues/detail`.
    pub async fn issue_detail(&self, repo: &str, number: u64) -> Result<IssueDto> {
        Ok(self.client.issue_detail(repo, number).await?)
    }

    /// `GET /api/v1/issues/comments`.
    pub async fn issue_comments(&self, repo: &str, number: u64) -> Result<Vec<IssueCommentDto>> {
        Ok(self.client.issue_comments(repo, number).await?)
    }

    /// `POST /api/v1/issues/comment`.
    pub async fn create_issue_comment(
        &self,
        repo: &str,
        number: u64,
        body: &str,
    ) -> Result<IssueCommentDto> {
        Ok(self.client.create_issue_comment(repo, number, body).await?)
    }

    /// `POST /api/v1/issues`.
    pub async fn create_issue(
        &self,
        repo: &str,
        title: &str,
        body: Option<&str>,
    ) -> Result<IssueDto> {
        Ok(self.client.create_issue(repo, title, body).await?)
    }

    /// `POST /api/v1/issues/close`.
    pub async fn close_issue(&self, repo: &str, number: u64) -> Result<IssueDto> {
        Ok(self.client.close_issue(repo, number).await?)
    }

    /// `POST /api/v1/issues/reopen`.
    pub async fn reopen_issue(&self, repo: &str, number: u64) -> Result<IssueDto> {
        Ok(self.client.reopen_issue(repo, number).await?)
    }

    // ── Pull requests ────────────────────────────────────────────────────

    /// `GET /api/v1/pulls`.
    pub async fn pull_requests(
        &self,
        repo: &str,
        state: Option<&str>,
        per_page: Option<u8>,
    ) -> Result<Vec<PrSummaryDto>> {
        Ok(self.client.pull_requests(repo, state, per_page).await?)
    }

    /// `GET /api/v1/pulls/detail`.
    pub async fn pull_request(&self, repo: &str, number: u64) -> Result<PrDetailDto> {
        Ok(self.client.pull_request(repo, number).await?)
    }

    /// `GET /api/v1/pulls/files`.
    pub async fn pr_files(
        &self,
        repo: &str,
        number: u64,
    ) -> Result<Vec<gitnapse_protocol::DiffFileDto>> {
        Ok(self.client.pr_files(repo, number).await?)
    }

    /// `GET /api/v1/pulls/commits`.
    pub async fn pull_request_commits(&self, repo: &str, number: u64) -> Result<Vec<CommitDto>> {
        Ok(self.client.pull_request_commits(repo, number).await?)
    }

    /// `GET /api/v1/pulls/reviews`.
    pub async fn pull_request_reviews(&self, repo: &str, number: u64) -> Result<Vec<PrReviewDto>> {
        Ok(self.client.pull_request_reviews(repo, number).await?)
    }

    /// `GET /api/v1/pulls/comments`.
    pub async fn pull_request_comments(
        &self,
        repo: &str,
        number: u64,
    ) -> Result<Vec<PrCommentDto>> {
        Ok(self.client.pull_request_comments(repo, number).await?)
    }

    /// `GET /api/v1/pulls/conversation`.
    pub async fn pr_conversation(&self, repo: &str, number: u64) -> Result<Vec<IssueCommentDto>> {
        Ok(self.client.pr_conversation(repo, number).await?)
    }

    /// `POST /api/v1/pulls`.
    pub async fn create_pull_request(
        &self,
        repo: &str,
        title: &str,
        head: &str,
        base: &str,
        body: Option<&str>,
    ) -> Result<PrDetailDto> {
        Ok(self
            .client
            .create_pull_request(repo, title, head, base, body)
            .await?)
    }

    /// `POST /api/v1/pulls/merge`.
    pub async fn merge_pull_request(
        &self,
        repo: &str,
        number: u64,
        commit_title: Option<&str>,
        method: Option<&str>,
    ) -> Result<MergeResultDto> {
        Ok(self
            .client
            .merge_pull_request(repo, number, commit_title, method)
            .await?)
    }

    /// `POST /api/v1/pulls/update`.
    pub async fn update_pull_request(&self, repo: &str, number: u64, state: &str) -> Result<()> {
        Ok(self.client.update_pull_request(repo, number, state).await?)
    }

    /// `POST /api/v1/pulls/reviews`.
    pub async fn review_pull_request(
        &self,
        repo: &str,
        number: u64,
        event: &str,
        body: Option<&str>,
    ) -> Result<()> {
        Ok(self
            .client
            .review_pull_request(repo, number, event, body)
            .await?)
    }

    /// `POST /api/v1/pulls/comments`.
    pub async fn comment_pull_request(&self, repo: &str, number: u64, body: &str) -> Result<()> {
        Ok(self.client.comment_pull_request(repo, number, body).await?)
    }

    // ── Releases / repos ─────────────────────────────────────────────────

    /// `GET /api/v1/releases`.
    pub async fn releases(&self, repo: &str, per_page: Option<u8>) -> Result<Vec<ReleaseDto>> {
        Ok(self.client.releases(repo, per_page).await?)
    }

    /// `POST /api/v1/releases`.
    pub async fn create_release(
        &self,
        repo: &str,
        tag_name: &str,
        name: Option<&str>,
        body: Option<&str>,
        prerelease: bool,
    ) -> Result<ReleaseDto> {
        Ok(self
            .client
            .create_release(repo, tag_name, name, body, prerelease)
            .await?)
    }

    /// `POST /api/v1/repos`.
    pub async fn create_repo(
        &self,
        name: &str,
        description: Option<&str>,
        private: bool,
    ) -> Result<RepoDto> {
        Ok(self.client.create_repo(name, description, private).await?)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base_url_is_kept_and_normalized_by_the_client() {
        let api = ApiClient::new("http://127.0.0.1:8787/").expect("client");
        assert_eq!(api.base_url(), "http://127.0.0.1:8787/");
    }

    #[test]
    fn invalid_base_url_is_rejected() {
        assert!(ApiClient::new("not a url").is_err());
    }
}
