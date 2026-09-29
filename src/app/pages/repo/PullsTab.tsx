import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { Button, Select } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import { EmptyPanel } from "../../../features/repo/components/EmptyPanel";
import { MergePullDialog } from "../../../features/repo/components/MergePullDialog";
import { PrRow } from "../../../features/repo/components/PrRow";
import { PullCreateDialog } from "../../../features/repo/components/PullCreateDialog";
import { PullDetail } from "../../../features/repo/components/PullDetail";
import { QueryFeedback } from "../../../features/repo/components/QueryFeedback";
import { SectionPanel } from "../../../features/repo/components/SectionPanel";
import {
  buildRepoQuery,
  mergeRepoQuery,
  parseNumberParam,
  parsePullState,
  parsePullView,
} from "../../../features/repo/lib/query";

const stateOptions = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

export default function PullsTab() {
  const { owner = "", name = "" } = useParams();
  const fullName = `${owner}/${name}`;
  const [params, setParams] = useSearchParams();
  const state = parsePullState(params.get("state"));
  const number = parseNumberParam(params.get("number"));
  const view = parsePullView(params.get("view"));
  const isNew = params.get("new") === "1";
  const [wizardOpen, setWizardOpen] = useState(isNew);
  const [mergeOpen, setMergeOpen] = useState(false);

  useEffect(() => {
    if (isNew) {
      setWizardOpen(true);
    }
  }, [isNew]);

  const repo = useQuery({
    queryKey: ["repo", fullName],
    queryFn: () => bridge.repoDetail(fullName),
  });
  const branches = useQuery({
    queryKey: ["repo-branches", fullName],
    queryFn: () => bridge.branches(fullName),
  });
  const pulls = useQuery({
    queryKey: ["pulls", fullName, state],
    queryFn: () => bridge.pullRequests(fullName, state === "all" ? undefined : state, 50),
  });

  const closeWizard = () => {
    setWizardOpen(false);
    if (isNew) {
      setParams(mergeRepoQuery(params, { isNew: false }));
    }
  };

  const detailSearch = (target: number) =>
    buildRepoQuery({ number: target, state: state === "open" ? null : state });

  return (
    <div className="master-detail">
      <SectionPanel
        title="Pull requests"
        label={`${pulls.data?.length ?? 0} shown`}
        actions={
          <Button variant="technical" onClick={() => setWizardOpen(true)}>
            New pull request
          </Button>
        }
      >
        <div className="master-detail__filters">
          <Select
            label="State"
            options={stateOptions}
            value={state}
            onChange={(event) => {
              setParams(
                mergeRepoQuery(params, {
                  state: event.target.value === "open" ? null : event.target.value,
                  number: null,
                }),
              );
            }}
          />
        </div>
        <QueryFeedback
          pending={pulls.isPending}
          error={pulls.error}
          onRetry={() => void pulls.refetch()}
        />
        {pulls.isSuccess && pulls.data.length === 0 ? (
          <EmptyPanel title="NO PULL REQUESTS" hint="Nothing matched the current filter." />
        ) : null}
        {pulls.isSuccess && pulls.data.length > 0 ? (
          <ul className="rows">
            {pulls.data.map((pull) => (
              <PrRow
                key={pull.number}
                pull={pull}
                to={detailSearch(pull.number)}
                selected={pull.number === number}
              />
            ))}
          </ul>
        ) : null}
      </SectionPanel>

      <div className="master-detail__detail">
        {number ? (
          <PullDetail
            repo={fullName}
            number={number}
            view={view}
            onViewChange={(next) => setParams(mergeRepoQuery(params, { view: next }))}
            onClose={() => setParams(mergeRepoQuery(params, { number: null, view: null }))}
            onMerge={() => setMergeOpen(true)}
          />
        ) : (
          <EmptyPanel
            title="SELECT A PULL REQUEST"
            hint="Choose a pull request from the list to inspect its conversation, files and reviews."
          />
        )}
      </div>

      <PullCreateDialog
        open={wizardOpen}
        onClose={closeWizard}
        repo={fullName}
        defaultBase={repo.data?.default_branch ?? "main"}
        branches={branches.data ?? []}
        onCreated={(created) => {
          setWizardOpen(false);
          setParams(mergeRepoQuery(params, { number: created, view: null, isNew: false }));
        }}
      />

      {number !== null ? (
        <MergePullDialog
          open={mergeOpen}
          onClose={() => setMergeOpen(false)}
          repo={fullName}
          number={number}
        />
      ) : null}
    </div>
  );
}
