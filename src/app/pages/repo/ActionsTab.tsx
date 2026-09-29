import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { IconButton, RelativeTime, Select } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import type { CheckRunDto, WorkflowRunDto } from "../../../lib/types";
import { QueryFeedback } from "../../../features/repo/components/QueryFeedback";
import { SectionPanel } from "../../../features/repo/components/SectionPanel";
import { StatusDot } from "../../../features/repo/components/StatusDot";
import { checkLabel, checkTone } from "../../../features/repo/lib/tones";
import { mergeRepoQuery, parseRefParam } from "../../../features/repo/lib/query";

function CheckRunRow({ run }: { run: CheckRunDto }) {
  return (
    <li className="datarow">
      <div className="datarow__grow">
        <StatusDot tone={checkTone(run.status, run.conclusion)} label={checkLabel(run.status, run.conclusion)} />
        <span className="datarow__main">
          <span className="datarow__title">{run.name}</span>
          <span className="datarow__meta">
            {run.started_at ? (
              <span className="datarow__time">
                <span className="t-label">started</span>
                <RelativeTime value={run.started_at} />
              </span>
            ) : null}
            {run.completed_at ? (
              <span className="datarow__time">
                <span className="t-label">finished</span>
                <RelativeTime value={run.completed_at} />
              </span>
            ) : null}
          </span>
        </span>
      </div>
      <span className="datarow__trailing">
        <IconButton
          icon={ExternalLink}
          size="sm"
          label={`Open check ${run.name} on GitHub`}
          onClick={() => {
            void bridge.openExternal(run.html_url);
          }}
        />
      </span>
    </li>
  );
}

function WorkflowRunRow({ run }: { run: WorkflowRunDto }) {
  return (
    <li className="datarow">
      <div className="datarow__grow">
        <StatusDot tone={checkTone(run.status, run.conclusion)} label={checkLabel(run.status, run.conclusion)} />
        <span className="datarow__main">
          <span className="datarow__title">{run.name}</span>
          <span className="datarow__meta">
            <span className="datarow__time">
              <span className="t-label">created</span>
              <RelativeTime value={run.created_at} />
            </span>
            <span className="datarow__time">
              <span className="t-label">updated</span>
              <RelativeTime value={run.updated_at} />
            </span>
          </span>
        </span>
      </div>
      <span className="datarow__trailing">
        <IconButton
          icon={ExternalLink}
          size="sm"
          label={`Open workflow run ${run.name} on GitHub`}
          onClick={() => {
            void bridge.openExternal(run.html_url);
          }}
        />
      </span>
    </li>
  );
}

export default function ActionsTab() {
  const { owner = "", name = "" } = useParams();
  const fullName = `${owner}/${name}`;
  const [params, setParams] = useSearchParams();
  const [branch, setBranch] = useState("");

  const repo = useQuery({
    queryKey: ["repo", fullName],
    queryFn: () => bridge.repoDetail(fullName),
  });
  const branches = useQuery({
    queryKey: ["repo-branches", fullName],
    queryFn: () => bridge.branches(fullName),
  });
  const ref = parseRefParam(params.get("ref")) ?? repo.data?.default_branch ?? "";

  const checks = useQuery({
    queryKey: ["check-runs", fullName, ref],
    queryFn: () => bridge.checkRuns(fullName, ref),
    enabled: ref.length > 0,
  });
  const runs = useQuery({
    queryKey: ["workflow-runs", fullName, branch],
    queryFn: () => bridge.workflowRuns(fullName, branch || undefined, 30),
  });

  const branchOptions = (branches.data ?? []).map((entry) => ({ value: entry, label: entry }));
  const runBranchOptions = [{ value: "", label: "All branches" }, ...branchOptions];

  return (
    <>
      <SectionPanel
        title="Check runs"
        label="CI"
        actions={
          <Select
            label="Ref"
            options={branchOptions}
            value={ref}
            onChange={(event) => setParams(mergeRepoQuery(params, { ref: event.target.value }))}
          />
        }
      >
        <QueryFeedback
          pending={checks.isPending && ref.length > 0}
          error={checks.error}
          onRetry={() => void checks.refetch()}
        />
        {checks.isSuccess && checks.data.length === 0 ? (
          <p className="t-label">[NO CHECK RUNS]</p>
        ) : null}
        {checks.isSuccess && checks.data.length > 0 ? (
          <ul className="rows">
            {checks.data.map((run) => (
              <CheckRunRow key={run.name} run={run} />
            ))}
          </ul>
        ) : null}
      </SectionPanel>

      <SectionPanel
        title="Workflow runs"
        label="Actions"
        actions={
          <div className="filterbar">
            <Select
              label="Branch"
              options={runBranchOptions}
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
            />
          </div>
        }
      >
        <QueryFeedback
          pending={runs.isPending}
          error={runs.error}
          onRetry={() => void runs.refetch()}
        />
        {runs.isSuccess && runs.data.length === 0 ? (
          <p className="t-label">[NO WORKFLOW RUNS]</p>
        ) : null}
        {runs.isSuccess && runs.data.length > 0 ? (
          <ul className="rows">
            {runs.data.map((run) => (
              <WorkflowRunRow key={`${run.name}-${run.created_at}`} run={run} />
            ))}
          </ul>
        ) : null}
      </SectionPanel>
    </>
  );
}
