import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { ArrowLeftRight } from "lucide-react";
import { Button, Select } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import { DiffView } from "../../../features/repo/components/DiffView";
import { EmptyPanel } from "../../../features/repo/components/EmptyPanel";
import { QueryFeedback } from "../../../features/repo/components/QueryFeedback";
import { SectionPanel } from "../../../features/repo/components/SectionPanel";
import { mergeRepoQuery, parseRefParam } from "../../../features/repo/lib/query";

export default function CompareTab() {
  const { owner = "", name = "" } = useParams();
  const fullName = `${owner}/${name}`;
  const [params, setParams] = useSearchParams();

  const repo = useQuery({
    queryKey: ["repo", fullName],
    queryFn: () => bridge.repoDetail(fullName),
  });
  const branches = useQuery({
    queryKey: ["repo-branches", fullName],
    queryFn: () => bridge.branches(fullName),
  });

  const list = branches.data ?? [];
  const defaultBranch = repo.data?.default_branch ?? "main";
  const base = parseRefParam(params.get("base")) ?? defaultBranch;
  const head = parseRefParam(params.get("head")) ?? list.find((branch) => branch !== base) ?? "";

  const compare = useQuery({
    queryKey: ["compare", fullName, base, head],
    queryFn: () => bridge.compareBranches(fullName, base, head),
    enabled: base.length > 0 && head.length > 0 && base !== head,
  });

  const branchOptions = list.map((branch) => ({ value: branch, label: branch }));

  return (
    <SectionPanel title="Compare branches" label="Diffs">
      <div className="filterbar">
        <Select
          label="Base"
          options={branchOptions}
          value={base}
          onChange={(event) => setParams(mergeRepoQuery(params, { base: event.target.value }))}
        />
        <Button
          variant="technical"
          icon={ArrowLeftRight}
          aria-label="Swap base and head"
          onClick={() => setParams(mergeRepoQuery(params, { base: head, head: base }))}
        >
          Swap
        </Button>
        <Select
          label="Head"
          options={branchOptions}
          value={head}
          onChange={(event) => setParams(mergeRepoQuery(params, { head: event.target.value }))}
        />
      </div>

      {branches.isPending || repo.isPending ? <QueryFeedback pending /> : null}
      {branches.isError ? (
        <QueryFeedback error={branches.error} onRetry={() => void branches.refetch()} />
      ) : null}
      {base === head ? (
        <EmptyPanel title="SELECT DIFFERENT REFS" hint="Base and head must be different branches." />
      ) : null}

      <QueryFeedback
        pending={compare.isPending && base !== head}
        error={compare.error}
        onRetry={() => void compare.refetch()}
      />

      {compare.isSuccess ? (
        <>
          <ul className="statrows">
            <li className="statrows__item">
              <span className="t-label">Status</span>
              <span className="t-data">{compare.data.status.toUpperCase()}</span>
            </li>
            <li className="statrows__item">
              <span className="t-label">Ahead</span>
              <span className="t-data">{String(compare.data.ahead_by)}</span>
            </li>
            <li className="statrows__item">
              <span className="t-label">Behind</span>
              <span className="t-data">{String(compare.data.behind_by)}</span>
            </li>
            <li className="statrows__item">
              <span className="t-label">Commits</span>
              <span className="t-data">{String(compare.data.total_commits)}</span>
            </li>
          </ul>

          <DiffView files={compare.data.files} emptyLabel="NO FILE CHANGES" />
        </>
      ) : null}
    </SectionPanel>
  );
}
