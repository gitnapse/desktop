import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { GitFork, Star } from "lucide-react";
import type { RepoDto } from "../lib/types";
import { formatCount, repoPath } from "../lib/format";
import { iconSize, iconStroke } from "./icon";

export interface RepoCardProps {
  repo: RepoDto;
  to?: string;
  selected?: boolean;
  actions?: ReactNode;
  material?: "flat" | "glass";
  className?: string;
}

export function RepoCard({
  repo,
  to,
  selected = false,
  actions,
  material = "flat",
  className,
}: RepoCardProps) {
  const href = to ?? repoPath(repo);
  const classes = [
    "card",
    "card--interactive",
    "repocard",
    material === "glass" ? "glass glass--regular" : "glass-flat",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes} data-selected={selected ? "true" : undefined}>
      <header className="repocard__head">
        <p className="t-label repocard__owner">{repo.owner}</p>
        {repo.private ? <span className="t-label repocard__flag">PRIVATE</span> : null}
      </header>
      <h3 className="repocard__name">
        <Link
          className="repocard__link"
          to={href}
          aria-current={selected ? "true" : undefined}
        >
          {repo.name}
        </Link>
      </h3>
      <p className="repocard__description">{repo.description ?? "No description"}</p>
      <footer className="repocard__foot">
        <span className="t-label repocard__lang">
          <span
            className="langdot"
            data-lang={(repo.language ?? "none").toLowerCase()}
            aria-hidden="true"
          />
          {repo.language ?? "None"}
        </span>
        <span className="t-data repocard__metric" aria-label={`${repo.stargazers_count} stars`}>
          <Star size={iconSize.sm} strokeWidth={iconStroke} aria-hidden="true" />
          {formatCount(repo.stargazers_count)}
        </span>
        <span className="t-data repocard__metric" aria-label={`${repo.forks_count ?? 0} forks`}>
          <GitFork size={iconSize.sm} strokeWidth={iconStroke} aria-hidden="true" />
          {formatCount(repo.forks_count ?? 0)}
        </span>
        {actions ? <span className="repocard__actions">{actions}</span> : null}
      </footer>
    </article>
  );
}
