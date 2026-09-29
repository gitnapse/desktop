import { Check, Copy, ExternalLink, GitCompare } from "lucide-react";
import { Avatar, IconButton, RelativeTime } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import { compareUrl } from "../lib/urls";
import { useCopy } from "../lib/useCopy";
import type { CommitRowData } from "../lib/commit";

export interface CommitRowProps {
  commit: CommitRowData;
  avatar?: boolean;
  compact?: boolean;
  repoFullName?: string | null;
  compareFrom?: string | null;
  onSelect?: (commit: CommitRowData) => void;
  selected?: boolean;
}

export function CommitRow({
  commit,
  avatar = false,
  compact = false,
  repoFullName = null,
  compareFrom = null,
  onSelect,
  selected = false,
}: CommitRowProps) {
  const { copied, copy } = useCopy();

  const main = (
    <>
      {avatar ? <Avatar login={commit.authorName} size="sm" /> : null}
      <span className="datarow__main">
        <span className="datarow__title">{commit.subject}</span>
        {!compact && commit.body ? <span className="datarow__body">{commit.body}</span> : null}
        <span className="datarow__meta">
          <code className="datarow__sha">{commit.shortSha}</code>
          <span className="datarow__author">{commit.authorName}</span>
        </span>
      </span>
    </>
  );

  const compare =
    repoFullName && compareFrom && compareFrom !== commit.sha
      ? compareUrl(repoFullName, compareFrom, commit.sha)
      : null;
  const htmlUrl = repoFullName
    ? `https://github.com/${repoFullName}/commit/${commit.sha}`
    : null;

  return (
    <li className="datarow datarow--commit" data-selected={selected ? "true" : undefined}>
      {onSelect ? (
        <button
          type="button"
          className="datarow__grow"
          onClick={() => onSelect(commit)}
          aria-label={`View diff for commit ${commit.shortSha}`}
        >
          {main}
        </button>
      ) : (
        <div className="datarow__grow">{main}</div>
      )}
      <span className="datarow__trailing">
        <RelativeTime value={commit.date} />
        <IconButton
          icon={copied ? Check : Copy}
          size="sm"
          label={copied ? "Commit hash copied" : `Copy commit hash ${commit.shortSha}`}
          onClick={() => copy(commit.sha)}
        />
        {htmlUrl ? (
          <IconButton
            icon={ExternalLink}
            size="sm"
            label={`View commit ${commit.shortSha} on GitHub`}
            onClick={() => {
              void bridge.openExternal(htmlUrl);
            }}
          />
        ) : null}
        {compare ? (
          <IconButton
            icon={GitCompare}
            size="sm"
            label={`Compare ${compareFrom} with ${commit.shortSha}`}
            onClick={() => {
              void bridge.openExternal(compare);
            }}
          />
        ) : null}
      </span>
    </li>
  );
}
