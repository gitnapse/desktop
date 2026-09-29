import type { CommitDto, GitLogEntry } from "../../../lib/types";

export interface CommitRowData {
  sha: string;
  shortSha: string;
  subject: string;
  body: string;
  authorName: string;
  date: string;
}

export function splitCommitMessage(message: string): { subject: string; body: string } {
  const normalized = message.replace(/\r\n/g, "\n").trimEnd();
  const index = normalized.indexOf("\n");
  if (index === -1) {
    return { subject: normalized, body: "" };
  }
  return {
    subject: normalized.slice(0, index),
    body: normalized.slice(index + 1).trim(),
  };
}

export function commitToRow(commit: CommitDto): CommitRowData {
  const { subject, body } = splitCommitMessage(commit.message);
  return {
    sha: commit.sha,
    shortSha: commit.sha.slice(0, 7),
    subject,
    body,
    authorName: commit.author_name,
    date: commit.author_date,
  };
}

export function logEntryToRow(entry: GitLogEntry): CommitRowData {
  const { subject, body } = splitCommitMessage(entry.subject);
  return {
    sha: entry.hash,
    shortSha: entry.short,
    subject,
    body,
    authorName: entry.author_name,
    date: entry.date,
  };
}
