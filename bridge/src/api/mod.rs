//! Remote GitHub data over HTTP: typed client wrapper + sidecar lifecycle.

pub mod client;
pub mod server;

pub use client::ApiClient;
pub use server::ServerManager;
