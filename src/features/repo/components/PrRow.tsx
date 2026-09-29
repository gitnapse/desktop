import { Link } from "react-router-dom";
import { RelativeTime } from "../../../ui";
import type { PrSummaryDto } from "../../../lib/types";
import { pullLabel, pullTone } from "../lib/tones";
import { StatusDot } from "./StatusDot";

export interface PrRowProps {
  pull: PrSummaryDto;
  to: string;
  selected?: boolean;
}

export function PrRow({ pull, to, selected = false }: PrRowProps) {
  return (
    <li className="datarow" data-selected={selected ? "true" : undefined}>
      <Link to={to} className="datarow__grow" aria-current={selected ? "true" : undefined}>
        <span className="datarow__main">
          <span className="datarow__title">
            {pull.title} <span className="datarow__number">{`#${pull.number}`}</span>
          </span>
          <span className="datarow__meta">
            <StatusDot tone={pullTone(pull)} label={pullLabel(pull)} />
            <span>{`@${pull.user.login}`}</span>
            <RelativeTime value={pull.updated_at} />
          </span>
        </span>
      </Link>
    </li>
  );
}
