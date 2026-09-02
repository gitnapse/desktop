//! Remote backend: the GitNapse HTTP API (`gitnapse-server` + client).
//!
//! Every GitHub-facing operation is delegated here so the UI never talks to
//! the GitHub REST API directly. The server is expected to run locally
//! (`GITNAPSE_SERVER_URL`, default `http://127.0.0.1:8787`).

use gitnapse_protocol::HealthDto;

/// Base URL of the GitNapse protocol server.
pub fn server_url() -> String {
    std::env::var("GITNAPSE_SERVER_URL").unwrap_or_else(|_| "http://127.0.0.1:8787".into())
}

/// Client for the GitNapse protocol server.
pub struct Api {
    client: gitnapse_client::Client,
}

impl Api {
    pub fn connect() -> Result<Self, String> {
        Ok(Self {
            client: gitnapse_client::Client::new(&server_url()).map_err(|e| e.to_string())?,
        })
    }

    pub fn client(&self) -> &gitnapse_client::Client {
        &self.client
    }
}

/// `GET /health` — is a gitnapse-server reachable?
pub async fn server_status() -> Result<HealthDto, String> {
    let api = Api::connect()?;
    api.client().health().await.map_err(|e| e.to_string())
}
