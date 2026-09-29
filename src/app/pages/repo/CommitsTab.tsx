import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { GitCompare } from "lucide-react";
import { Select } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import { CommitRow } from "../../../features/repo/components/CommitRow";
import { QueryFeedback } from "../../../features/repo/components/QueryFeedback";
import { commitToRow } from "../../../features/repo/lib/commit";
import { buildRepoQuery, mergeRepoQuery, parseRefParam } from "../../../features/repo/lib/query";

export default function CommitsTab() {
  const { owner = "", name = "" } = useParams();
  const fullName = `${owner}/${name}`;
  const [params, setParams] = useSearchParams();
  const ref = parseRefParam(params.get("ref"));

  const repo = useQuery({
    queryKey: ["repo", fullName],
    queryFn: () => bridge.repoDetail(fullName),
  });
  const branches = useQuery({
    queryKey: ["repo-branches", fullName],
    queryFn: () => bridge.branches(fullName),
  });
  const commits = useQuery({
    queryKey: ["repo-commits", fullName, ref, 30],
    queryFn: () => bridge.recentCommits(fullName, ref ?? undefined, 30),
  });

  const compareFrom = ref ?? repo.data?.default_branch ?? null;
  const compareHref = compareFrom
    ? `compare${buildRepoQuery({ base: compareFrom, head: ref })}`
    : "compare";

  const branchOptions = [
    { value: "", label: "Default branch" },
    ...(branches.data ?? []).map((branch) => ({ value: branch, label: branch })),
  ];

  return (
    <section className="rpanel glass-flat">
      <header className="rpanel__head">
        <div className="rpanel__titles">
          <p className="t-label rpanel__label">History</p>
          <h2 className="rpanel__title">Commits</h2>
        </div>
        <div className="rpanel__actions">
          <Link className="btn btn--technical" to={compareHref}>
            <GitCompare size={16} strokeWidth={1.5} aria-hidden="true" />
            Compare
          </Link>
        </div>
      </header>
      <div className="rpanel__body">
        <div className="filterbar">
          <Select
            label="Ref"
            options={branchOptions}
            value={ref ?? ""}
            onChange={(event) => {
              setParams(mergeRepoQuery(params, { ref: event.target.value || null }));
            }}
          />
        </div>
        <QueryFeedback
          pending={commits.isPending}
          error={commits.error}
          onRetry={() => void commits.refetch()}
        />
        {commits.isSuccess && commits.data.length === 0 ? (
          <p className="t-label">[NO COMMITS]</p>
        ) : null}
        {commits.isSuccess && commits.data.length > 0 ? (
          <ul className="rows">
            {commits.data.map((commit) => (
              <CommitRow
                key={commit.sha}
                commit={commitToRow(commit)}
                avatar
                repoFullName={fullName}
                compareFrom={compareFrom}
              />
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
