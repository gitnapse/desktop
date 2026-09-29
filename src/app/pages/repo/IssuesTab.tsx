import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { Button, Input, Select } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import { EmptyPanel } from "../../../features/repo/components/EmptyPanel";
import { IssueCreateDialog } from "../../../features/repo/components/IssueCreateDialog";
import { IssueDetail } from "../../../features/repo/components/IssueDetail";
import { IssueRow } from "../../../features/repo/components/IssueRow";
import { QueryFeedback } from "../../../features/repo/components/QueryFeedback";
import { SectionPanel } from "../../../features/repo/components/SectionPanel";
import {
  buildRepoQuery,
  mergeRepoQuery,
  parseIssueState,
  parseNumberParam,
} from "../../../features/repo/lib/query";

const stateOptions = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

export default function IssuesTab() {
  const { owner = "", name = "" } = useParams();
  const fullName = `${owner}/${name}`;
  const [params, setParams] = useSearchParams();
  const state = parseIssueState(params.get("state"));
  const number = parseNumberParam(params.get("number"));
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const issues = useQuery({
    queryKey: ["issues", fullName, state],
    queryFn: () => bridge.issues(fullName, state === "all" ? undefined : state, 50),
  });

  const filtered = useMemo(() => {
    const list = issues.data ?? [];
    const term = search.trim().toLowerCase().replace(/^#/, "");
    if (term.length === 0) {
      return list;
    }
    return list.filter(
      (issue) =>
        issue.title.toLowerCase().includes(term) || String(issue.number).includes(term),
    );
  }, [issues.data, search]);

  const detailSearch = (target: number) =>
    buildRepoQuery({ number: target, state: state === "open" ? null : state });

  return (
    <div className="master-detail">
      <SectionPanel
        title="Issues"
        label={`${filtered.length} shown`}
        actions={
          <Button variant="technical" onClick={() => setCreateOpen(true)}>
            New issue
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
          <Input
            label="Filter"
            placeholder="Title or number"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <QueryFeedback
          pending={issues.isPending}
          error={issues.error}
          onRetry={() => void issues.refetch()}
        />
        {issues.isSuccess && filtered.length === 0 ? (
          <EmptyPanel title="NO ISSUES" hint="Nothing matched the current filters." />
        ) : null}
        {filtered.length > 0 ? (
          <ul className="rows">
            {filtered.map((issue) => (
              <IssueRow
                key={issue.number}
                issue={issue}
                to={detailSearch(issue.number)}
                selected={issue.number === number}
              />
            ))}
          </ul>
        ) : null}
      </SectionPanel>

      <div className="master-detail__detail">
        {number ? (
          <IssueDetail
            repo={fullName}
            number={number}
            onClose={() => setParams(mergeRepoQuery(params, { number: null }))}
          />
        ) : (
          <EmptyPanel
            title="SELECT AN ISSUE"
            hint="Choose an issue from the list to read the thread."
          />
        )}
      </div>

      <IssueCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        repo={fullName}
        onCreated={(created) => {
          setCreateOpen(false);
          setParams(mergeRepoQuery(params, { number: created, state: null }));
        }}
      />
    </div>
  );
}
