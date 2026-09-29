import { Badge, Button } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import type { GitRepoInfo, GitStatus } from "../../../lib/types";
import { totalChanges } from "../lib/status";

export interface LocalHeaderProps {
  info: GitRepoInfo;
  status: GitStatus | null;
  onClose: () => void;
}

export function LocalHeader({ info, status, onClose }: LocalHeaderProps) {
  const changes = status ? totalChanges(status) : null;
  const remote = info.full_name ? `https://github.com/${info.full_name}` : null;

  return (
    <section className="localhead glass-flat">
      <div className="localhead__main">
        <p className="t-label localhead__label">Working tree</p>
        <h2 className="localhead__name">{info.name}</h2>
        <p className="t-caption localhead__path" title={info.root}>
          {info.root}
        </p>
      </div>
      <div className="localhead__meta">
        <span className="localhead__item">
          <span className="t-label">Branch</span>
          <code>{info.branch ?? (info.detached ? "detached" : "—")}</code>
        </span>
        {info.ahead > 0 ? <Badge tone="warn">{`Ahead ${info.ahead}`}</Badge> : null}
        {info.behind > 0 ? <Badge tone="warn">{`Behind ${info.behind}`}</Badge> : null}
        {changes !== null ? (
          changes === 0 ? (
            <Badge tone="ok">Clean</Badge>
          ) : (
            <Badge tone="warn">{`${changes} changed`}</Badge>
          )
        ) : null}
        {remote ? (
          <Button
            variant="technical"
            onClick={() => {
              void bridge.openExternal(remote);
            }}
          >
            Remote
          </Button>
        ) : null}
        <Button variant="technical" onClick={onClose}>
          Close
        </Button>
      </div>
    </section>
  );
}
