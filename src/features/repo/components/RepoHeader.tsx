import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChevronDown, GitBranch } from "lucide-react";
import { Badge, Dropdown, DropdownItem, RelativeTime, StatTile, iconSize, iconStroke } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import type { RepoDto } from "../../../lib/types";
import { formatCount } from "../../../lib/format";
import { localClonePath } from "../lib/urls";

export interface RepoHeaderProps {
  repo: RepoDto;
  fullName: string;
  refName: string | null;
  onRefChange: (ref: string | null) => void;
}

export function RepoHeader({ repo, fullName, refName, onRefChange }: RepoHeaderProps) {
  const branches = useQuery({
    queryKey: ["repo-branches", fullName],
    queryFn: () => bridge.branches(fullName),
  });
  const cloneDir = useQuery({ queryKey: ["clone-dir"], queryFn: bridge.cloneDir });
  const candidate = cloneDir.data ? localClonePath(cloneDir.data, fullName) : null;
  const local = useQuery({
    queryKey: ["git-repo-info", candidate],
    queryFn: () => bridge.gitRepoInfo(candidate ?? ""),
    enabled: Boolean(candidate),
    retry: false,
  });

  const currentRef = refName ?? repo.default_branch;
  const isLocal = Boolean(candidate && local.data && local.data.full_name === fullName);

  return (
    <section className="repohead glass-flat">
      <div className="repohead__top">
        <div className="repohead__identity">
          <span className="t-label repohead__owner">{repo.owner}</span>
          <h2 className="repohead__name">{repo.name}</h2>
          {repo.private ? <Badge>Private</Badge> : null}
        </div>
        <div className="repohead__branch">
          <Dropdown
            label="Switch branch"
            align="end"
            trigger={
              <>
                <GitBranch size={iconSize.md} strokeWidth={iconStroke} aria-hidden="true" />
                <span className="t-data repohead__ref">{currentRef}</span>
                <ChevronDown size={iconSize.sm} strokeWidth={iconStroke} aria-hidden="true" />
              </>
            }
          >
            {branches.isPending ? <span className="t-label dropdown__note">[LOADING…]</span> : null}
            {branches.isError ? <span className="t-label dropdown__note">[ERROR]</span> : null}
            {branches.isSuccess
              ? branches.data.map((branch) => (
                  <DropdownItem
                    key={branch}
                    onSelect={() => onRefChange(branch === repo.default_branch ? null : branch)}
                  >
                    <span className="t-data">{branch}</span>
                    {branch === repo.default_branch ? (
                      <span className="t-label dropdown__note">default</span>
                    ) : null}
                  </DropdownItem>
                ))
              : null}
          </Dropdown>
        </div>
      </div>

      <p className={repo.description ? "repohead__description" : "repohead__description repohead__description--empty"}>
        {repo.description ?? "No description"}
      </p>

      {(repo.topics ?? []).length > 0 ? (
        <ul className="repohead__topics" aria-label="Topics">
          {(repo.topics ?? []).map((topic) => (
            <li key={topic}>
              <Badge>{topic}</Badge>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="repohead__meta">
        <span className="t-label repohead__lang">
          <span
            className="langdot"
            data-lang={(repo.language ?? "none").toLowerCase()}
            aria-hidden="true"
          />
          {repo.language ?? "None"}
        </span>
        <span className="t-label repohead__updated">
          Updated <RelativeTime value={repo.updated_at ?? ""} />
        </span>
        {isLocal && candidate ? (
          <span className="repohead__local">
            <Badge tone="ok">Local clone</Badge>
            <Link to="/local" className="t-label repohead__local-link">
              Open local
            </Link>
            <span className="t-caption repohead__local-path" title={candidate}>
              {candidate}
            </span>
          </span>
        ) : null}
      </div>

      <div className="statgrid repohead__stats">
        <StatTile label="Stars" value={formatCount(repo.stargazers_count)} />
        <StatTile label="Forks" value={formatCount(repo.forks_count ?? 0)} />
        <StatTile label="Watchers" value={formatCount(repo.watchers_count ?? 0)} />
        <StatTile
          label="Open issues"
          value={String(repo.open_issues_count ?? 0)}
          hint="Issues and pull requests"
        />
      </div>
    </section>
  );
}
