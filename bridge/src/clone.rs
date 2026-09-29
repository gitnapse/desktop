//! Repository cloning: core spec resolution plus `git clone --progress` with
//! parsed progress events.

use crate::dto::{CloneProgress, CloneResult};
use anyhow::{Context, Result, bail};
use std::io::Read;
use std::path::PathBuf;
use std::process::{Command, Stdio};

/// Clones `spec` into `dir` (or the configured clone directory when blank).
///
/// `spec` follows the core semantics (`owner/repo`, `owner/repo:branch` or a
/// full URL). `branch` overrides a branch embedded in the spec. `git clone`'s
/// stderr is streamed and each recognized progress line is handed to
/// `on_progress`; a final `done` or `error` event is always emitted.
pub fn clone_repo(
    spec: &str,
    dir: Option<String>,
    branch: Option<String>,
    mut on_progress: impl FnMut(CloneProgress),
) -> Result<CloneResult> {
    on_progress(progress("resolving", format!("Resolving {spec}"), None));
    match clone_inner(spec, dir, branch, &mut on_progress) {
        Ok(result) => {
            on_progress(progress(
                "done",
                format!("Cloned into {}", result.path),
                Some(100),
            ));
            Ok(result)
        }
        Err(error) => {
            on_progress(progress("error", error.to_string(), None));
            Err(error)
        }
    }
}

fn clone_inner(
    spec: &str,
    dir: Option<String>,
    branch: Option<String>,
    on_progress: &mut impl FnMut(CloneProgress),
) -> Result<CloneResult> {
    let target = gitnapse::git::resolve_clone_target(spec)?;

    let dest = match dir.as_deref().map(str::trim).filter(|dir| !dir.is_empty()) {
        Some(dir) => PathBuf::from(dir),
        None => PathBuf::from(crate::config::clone_dir()?),
    };
    if let Some(parent) = dest
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
    {
        std::fs::create_dir_all(parent)
            .with_context(|| format!("cannot create parent directory {}", parent.display()))?;
    }

    let branch = branch
        .map(|branch| branch.trim().to_string())
        .filter(|branch| !branch.is_empty())
        .or(target.branch);

    let mut cmd = Command::new("git");
    cmd.arg("clone").arg("--progress");
    if let Some(branch) = branch.as_deref() {
        cmd.args(["--branch", branch]);
    }
    cmd.arg(&target.url)
        .arg(&dest)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::piped());

    let mut child = cmd.spawn().context("failed to execute git clone")?;
    let mut stderr = child
        .stderr
        .take()
        .context("git clone stderr was not captured")?;

    let mut collected = String::new();
    let mut pending: Vec<u8> = Vec::new();
    let mut buffer = [0u8; 4096];
    loop {
        let read = stderr
            .read(&mut buffer)
            .context("cannot read git clone output")?;
        if read == 0 {
            break;
        }
        pending.extend_from_slice(&buffer[..read]);
        while let Some(position) = pending
            .iter()
            .position(|byte| *byte == b'\n' || *byte == b'\r')
        {
            let line: Vec<u8> = pending.drain(..=position).collect();
            let text = String::from_utf8_lossy(&line[..line.len().saturating_sub(1)])
                .trim()
                .to_string();
            record_line(&text, &mut collected, on_progress);
        }
    }
    let tail = String::from_utf8_lossy(&pending).trim().to_string();
    record_line(&tail, &mut collected, on_progress);

    let status = child.wait().context("cannot wait for git clone")?;
    if !status.success() {
        let message = collected.trim();
        let message = if message.is_empty() {
            format!("git clone failed with {status}")
        } else {
            message.to_string()
        };
        bail!("git clone failed:\n{message}");
    }

    Ok(CloneResult {
        path: dest.display().to_string(),
        full_name: target.full_name,
    })
}

fn record_line(text: &str, collected: &mut String, on_progress: &mut impl FnMut(CloneProgress)) {
    if text.is_empty() {
        return;
    }
    collected.push_str(text);
    collected.push('\n');
    if let Some(progress) = parse_progress_line(text) {
        on_progress(progress);
    }
}

fn progress(phase: &str, message: String, percent: Option<u8>) -> CloneProgress {
    CloneProgress {
        phase: phase.to_string(),
        message,
        percent,
    }
}

/// Maps a `git clone --progress` stderr line to [`CloneProgress`] when it is
/// a progress phase we understand. Remote-prefixed lines (`remote: …`) are
/// unwrapped first; unknown lines return `None`.
pub fn parse_progress_line(line: &str) -> Option<CloneProgress> {
    let line = line.trim();
    let line = line.strip_prefix("remote:").map(str::trim).unwrap_or(line);
    let lower = line.to_ascii_lowercase();
    let phase = if lower.starts_with("receiving objects") {
        "receiving"
    } else if lower.starts_with("resolving deltas") {
        "resolving_deltas"
    } else if lower.starts_with("checking out") || lower.starts_with("updating files") {
        "checking_out"
    } else if lower.starts_with("counting objects")
        || lower.starts_with("enumerating objects")
        || lower.starts_with("compressing objects")
    {
        "counting"
    } else {
        return None;
    };
    Some(progress(phase, line.to_string(), parse_percent(line)))
}

fn parse_percent(line: &str) -> Option<u8> {
    let index = line.find('%')?;
    let digits: String = line[..index]
        .chars()
        .rev()
        .take_while(|ch| ch.is_ascii_digit())
        .collect::<Vec<_>>()
        .into_iter()
        .rev()
        .collect();
    digits.parse::<u8>().ok()
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::path::Path;

    #[test]
    fn parser_maps_git_progress_lines() {
        let cases = [
            (
                "remote: Counting objects: 100% (5/5), done.",
                "counting",
                Some(100),
            ),
            ("remote: Enumerating objects: 5, done.", "counting", None),
            (
                "remote: Compressing objects:  50% (1/2)",
                "counting",
                Some(50),
            ),
            ("Receiving objects:  45% (5/11)", "receiving", Some(45)),
            (
                "Resolving deltas:  10% (1/10)",
                "resolving_deltas",
                Some(10),
            ),
            (
                "Checking out files: 100% (5/5), done.",
                "checking_out",
                Some(100),
            ),
            ("Updating files:  80% (4/5)", "checking_out", Some(80)),
        ];
        for (line, phase, percent) in cases {
            let progress = parse_progress_line(line).expect("recognized line");
            assert_eq!(progress.phase, phase, "line: {line}");
            assert_eq!(progress.percent, percent, "line: {line}");
            let expected = line
                .trim()
                .strip_prefix("remote:")
                .map(str::trim)
                .unwrap_or_else(|| line.trim());
            assert_eq!(progress.message, expected, "line: {line}");
        }
    }

    #[test]
    fn parser_ignores_non_progress_lines() {
        for line in [
            "",
            "Cloning into '/tmp/dest'...",
            "fatal: repository 'https://example.invalid/x' not found",
            "warning: --depth is ignored in local clones",
        ] {
            assert!(parse_progress_line(line).is_none(), "line: {line}");
        }
    }

    #[test]
    fn parse_percent_reads_the_last_number_before_the_sign() {
        assert_eq!(parse_percent("Receiving objects: 100% (5/5)"), Some(100));
        assert_eq!(parse_percent("Receiving objects:   7% (1/14)"), Some(7));
        assert_eq!(parse_percent("no percent here"), None);
        assert_eq!(parse_percent("999%"), None);
    }

    #[test]
    fn clone_from_local_bare_repo_emits_done_and_clones_branch() {
        if !git_available() {
            eprintln!("skipping clone test: git is not available");
            return;
        }
        let root = tempfile::tempdir().expect("tempdir");
        let work = root.path().join("work");
        fs::create_dir(&work).expect("work dir");
        run_git(&work, &["init", "-q"]);
        run_git(&work, &["config", "user.email", "bridge@test.local"]);
        run_git(&work, &["config", "user.name", "Bridge Test"]);
        run_git(&work, &["config", "commit.gpgsign", "false"]);
        fs::write(work.join("README.md"), "hello bridge\n").expect("write file");
        run_git(&work, &["add", "--", "README.md"]);
        run_git(&work, &["commit", "-qm", "initial"]);

        let bare = root.path().join("origin.git");
        run_git(
            root.path(),
            &["init", "--bare", "-q", bare.to_str().expect("utf8 path")],
        );
        run_git(
            &work,
            &[
                "push",
                "-q",
                bare.to_str().expect("utf8 path"),
                "HEAD:refs/heads/main",
            ],
        );

        let dest = root.path().join("clone");
        let spec = format!("file://{}", bare.display());
        let mut events = Vec::new();
        let result = clone_repo(
            &spec,
            Some(dest.display().to_string()),
            Some("main".into()),
            |progress| events.push(progress),
        )
        .expect("clone");

        assert_eq!(result.path, dest.display().to_string());
        assert_eq!(result.full_name, None);
        assert_eq!(
            fs::read_to_string(dest.join("README.md")).expect("read clone"),
            "hello bridge\n"
        );
        assert!(
            events
                .iter()
                .any(|event| event.phase == "done" && event.percent == Some(100)),
            "expected a done event, got {events:?}"
        );
        assert!(
            events.iter().all(|event| event.phase != "error"),
            "unexpected error event: {events:?}"
        );
    }

    #[test]
    fn clone_failure_reports_an_error_event() {
        if !git_available() {
            eprintln!("skipping clone test: git is not available");
            return;
        }
        let root = tempfile::tempdir().expect("tempdir");
        let dest = root.path().join("missing");
        let spec = format!(
            "file://{}",
            root.path().join("does-not-exist.git").display()
        );
        let mut events = Vec::new();
        let error = clone_repo(&spec, Some(dest.display().to_string()), None, |progress| {
            events.push(progress)
        })
        .expect_err("clone must fail");
        assert!(error.to_string().contains("git clone failed"));
        assert!(
            events.iter().any(|event| event.phase == "error"),
            "expected an error event, got {events:?}"
        );
    }

    fn git_available() -> bool {
        Command::new("git")
            .arg("--version")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .is_ok_and(|status| status.success())
    }

    fn run_git(cwd: &Path, args: &[&str]) {
        let output = Command::new("git")
            .args(args)
            .current_dir(cwd)
            .output()
            .expect("run git");
        assert!(
            output.status.success(),
            "git {args:?} failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
}
