//! GitNapse Desktop entry point.
//!
//! Layout:
//! - `shared/`    cross-platform logic: commands (git local via the core SDK,
//!                GitHub data via the GitNapse HTTP API) + platform bits
//! - `platforms/` OS-specific code (linux/macos/windows/fallback), selected by
//!                `cfg(target_os)` and re-exported here

mod platforms;
mod shared;

use platforms::open_in_file_manager;
use shared::commands::{
    api_auth_status, api_clear_token, api_set_token, api_user, auth_status, branches,
    check_runs, clone_dir, clone_repo, close_issue, comment_pull_request, compare_branches,
    create_issue, create_pull_request, create_release, create_repo, file_content, git_raw, issues,
    merge_pull_request, pull_request, pull_request_comments, pull_request_commits,
    pull_request_reviews, pull_requests, rate_limit, recent_commits, releases, repo_detail,
    repo_tree, review_pull_request, search_repos, server_status, set_clone_dir, starred_repos,
    update_pull_request, workflow_runs,
};

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // local (core SDK)
            auth_status,
            clone_dir,
            set_clone_dir,
            clone_repo,
            git_raw,
            // remote (GitNapse API)
            server_status,
            search_repos,
            repo_detail,
            branches,
            repo_tree,
            file_content,
            recent_commits,
            compare_branches,
            check_runs,
            workflow_runs,
            issues,
            create_issue,
            close_issue,
            pull_requests,
            pull_request,
            create_pull_request,
            merge_pull_request,
            update_pull_request,
            pull_request_reviews,
            review_pull_request,
            pull_request_comments,
            comment_pull_request,
            pull_request_commits,
            releases,
            create_release,
            create_repo,
            api_user,
            starred_repos,
            rate_limit,
            api_auth_status,
            api_set_token,
            api_clear_token,
            // platform
            open_in_file_manager
        ])
        .run(tauri::generate_context!())
        .expect("error while running GitNapse Desktop");
}
