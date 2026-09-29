//! Bridge payloads exchanged with the Tauri shell and the React frontend.
//!
//! Wire shape is **snake_case** (serde default), matching the protocol DTOs.
//! Core and protocol types are re-exported verbatim — never redefined — so a
//! single source of truth for `GitRepoInfo`, `GitStatus`, `RepoDto`, … stays
//! in `gitnapse` / `gitnapse-protocol`.

use serde::{Deserialize, Serialize};

// Local git DTOs from the core (typed engine, no stdout parsing in the UI).
pub use gitnapse::git::{
    DiffMode, FileChange, GitBranch, GitLogEntry, GitRemote, GitRepoInfo, GitStashEntry, GitStatus,
    GitTag,
};
// Device-flow start payload is the core type as-is.
pub use gitnapse::oauth::DeviceFlow as DeviceFlowStart;
// Remote DTOs from the wire protocol.
pub use gitnapse_protocol::{
    ActorDto, AuthStatusDto, CheckRunDto, CodeSearchResultDto, CommitDto, CompareDto, ContentDto,
    ContributorDto, DiffFileDto, EventDto, HealthDto, IssueCommentDto, IssueDto, LabelDto,
    LanguageDto, MergeResultDto, NotificationDto, PrCommentDto, PrDetailDto, PrReviewDto,
    PrSummaryDto, RateLimitDto, ReleaseDto, RepoDto, TreeNodeDto, UserDto, UserProfileDto,
    WorkflowRunDto,
};

/// Result of `auth_status`: token presence, source label and — best effort —
/// the authenticated GitHub login.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AuthStatus {
    /// Whether a token is currently usable.
    pub has_token: bool,
    /// Human-readable `TokenSource` label (`GITHUB_TOKEN env`, `OAuth session`,
    /// `stored token` or `none`).
    pub source: String,
    /// Authenticated login when a token is present and the provider answered.
    pub login: Option<String>,
}

/// Lifecycle state of the `gitnapse-server` sidecar.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ServerState {
    /// A healthy server answered `GET /health`.
    Running,
    /// No server is reachable.
    Stopped,
    /// A server process was spawned and is not healthy yet.
    Starting,
}

/// Result of `server_status` / `server_start` / `server_stop`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ServerStatus {
    /// Lifecycle state.
    pub state: ServerState,
    /// Version reported by `GET /health`, when healthy.
    pub version: Option<String>,
    /// Base URL the app talks to (`GITNAPSE_SERVER_URL` or the default).
    pub url: String,
    /// Whether this app spawned (and therefore may kill) the process.
    pub owned: bool,
}

/// Result of `clone_repo`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CloneResult {
    /// Absolute (or as-requested) path of the created working tree.
    pub path: String,
    /// `owner/repo` when the spec identified a recognizable repository.
    pub full_name: Option<String>,
}

/// Payload of a `clone://progress` event.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct CloneProgress {
    /// `resolving`, `counting`, `receiving`, `resolving_deltas`,
    /// `checking_out`, `done` or `error`.
    pub phase: String,
    /// Human-readable progress line from git.
    pub message: String,
    /// Completion percentage of the current phase, when git reports one.
    pub percent: Option<u8>,
}

/// Poll status of the OAuth device flow.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DevicePollStatus {
    /// The user has not authorized yet; keep polling.
    Pending,
    /// GitHub asked to slow down; add five seconds before the next poll.
    SlowDown,
    /// Authorization completed; the token is persisted.
    Done,
    /// The user denied the request.
    Denied,
    /// The device code expired.
    Expired,
}

/// Result of one `auth_login_poll` call.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DeviceFlowPoll {
    /// Current poll status.
    pub status: DevicePollStatus,
    /// Login of the authorized user, only when [`DevicePollStatus::Done`].
    pub login: Option<String>,
}

impl From<gitnapse::oauth::DevicePoll> for DeviceFlowPoll {
    fn from(poll: gitnapse::oauth::DevicePoll) -> Self {
        use gitnapse::oauth::DevicePoll as P;
        match poll {
            P::Pending => Self {
                status: DevicePollStatus::Pending,
                login: None,
            },
            P::SlowDown => Self {
                status: DevicePollStatus::SlowDown,
                login: None,
            },
            P::Done(login) => Self {
                status: DevicePollStatus::Done,
                login: Some(login),
            },
            P::Denied => Self {
                status: DevicePollStatus::Denied,
                login: None,
            },
            P::Expired => Self {
                status: DevicePollStatus::Expired,
                login: None,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use gitnapse::oauth::DevicePoll;

    #[test]
    fn auth_status_serializes_snake_case() {
        let json = serde_json::to_value(AuthStatus {
            has_token: true,
            source: "stored token".into(),
            login: Some("octocat".into()),
        })
        .expect("serialize");
        assert_eq!(json["has_token"], true);
        assert_eq!(json["source"], "stored token");
        assert_eq!(json["login"], "octocat");

        let anonymous = serde_json::to_value(AuthStatus {
            has_token: false,
            source: "none".into(),
            login: None,
        })
        .expect("serialize");
        assert!(anonymous.get("login").expect("login key").is_null());
    }

    #[test]
    fn server_status_serializes_state_as_snake_case() {
        let json = serde_json::to_value(ServerStatus {
            state: ServerState::Running,
            version: Some("0.1.1".into()),
            url: "http://127.0.0.1:8787".into(),
            owned: true,
        })
        .expect("serialize");
        assert_eq!(json["state"], "running");
        assert_eq!(json["version"], "0.1.1");
        assert_eq!(json["url"], "http://127.0.0.1:8787");
        assert_eq!(json["owned"], true);

        for (state, expected) in [
            (ServerState::Stopped, "stopped"),
            (ServerState::Starting, "starting"),
        ] {
            let value = serde_json::to_value(state).expect("serialize");
            assert_eq!(value, expected);
        }
    }

    #[test]
    fn clone_progress_roundtrips() {
        let progress = CloneProgress {
            phase: "receiving".into(),
            message: "Receiving objects:  45% (5/11)".into(),
            percent: Some(45),
        };
        let json = serde_json::to_string(&progress).expect("serialize");
        let back: CloneProgress = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back, progress);
    }

    #[test]
    fn device_poll_maps_all_variants() {
        let cases = [
            (DevicePoll::Pending, DevicePollStatus::Pending, None),
            (DevicePoll::SlowDown, DevicePollStatus::SlowDown, None),
            (
                DevicePoll::Done("octocat".into()),
                DevicePollStatus::Done,
                Some("octocat".to_string()),
            ),
            (DevicePoll::Denied, DevicePollStatus::Denied, None),
            (DevicePoll::Expired, DevicePollStatus::Expired, None),
        ];
        for (poll, status, login) in cases {
            let mapped: DeviceFlowPoll = poll.into();
            assert_eq!(mapped.status, status);
            assert_eq!(mapped.login, login);
        }
    }

    #[test]
    fn device_flow_start_is_the_core_type() {
        let start = DeviceFlowStart {
            user_code: "ABCD-1234".into(),
            verification_uri: "https://github.com/login/device".into(),
            device_code: "device".into(),
            interval: 5,
            expires_in: 900,
        };
        let json = serde_json::to_value(&start).expect("serialize");
        assert_eq!(json["user_code"], "ABCD-1234");
        assert_eq!(json["verification_uri"], "https://github.com/login/device");
        assert_eq!(json["device_code"], "device");
        assert_eq!(json["interval"], 5);
        assert_eq!(json["expires_in"], 900);
    }
}
