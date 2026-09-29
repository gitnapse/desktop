import { Link } from "react-router-dom";
import { RelativeTime } from "../../../ui";
import type { IssueDto } from "../../../lib/types";
import { issueTone } from "../lib/tones";
import { LabelChip } from "./LabelChip";
import { StatusDot } from "./StatusDot";

export interface IssueRowProps {
  issue: IssueDto;
  to: string;
  selected?: boolean;
}

export function IssueRow({ issue, to, selected = false }: IssueRowProps) {
  return (
    <li className="datarow" data-selected={selected ? "true" : undefined}>
      <Link to={to} className="datarow__grow" aria-current={selected ? "true" : undefined}>
        <span className="datarow__main">
          <span className="datarow__title">
            {issue.title} <span className="datarow__number">{`#${issue.number}`}</span>
          </span>
          <span className="datarow__meta">
            <StatusDot tone={issueTone(issue.state)} label={issue.state} />
            <span>{`@${issue.user.login}`}</span>
            <RelativeTime value={issue.updated_at} />
          </span>
          {issue.labels.length > 0 ? (
            <span className="datarow__labels">
              {issue.labels.map((label) => (
                <LabelChip key={label.name} label={label} />
              ))}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  );
}
