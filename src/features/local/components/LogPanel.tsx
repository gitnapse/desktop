import { useQuery } from "@tanstack/react-query";
import { Select } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import { CommitRow } from "../../repo/components/CommitRow";
import { QueryFeedback } from "../../repo/components/QueryFeedback";
import { logEntryToRow } from "../../repo/lib/commit";
import { localKeys } from "../lib/keys";
import { LocalPanel } from "./LocalPanel";
import { useState } from "react";

export interface LogPanelProps {
  cwd: string;
  selectedRev: string | null;
  onSelectCommit: (rev: string) => void;
}

const limitOptions = [10, 20, 50, 100].map((value) => ({
  value: String(value),
  label: `${value} commits`,
}));

export function LogPanel({ cwd, selectedRev, onSelectCommit }: LogPanelProps) {
  const [limit, setLimit] = useState(20);

  const log = useQuery({
    queryKey: [...localKeys.log(cwd), limit],
    queryFn: () => bridge.gitLog(cwd, limit),
  });

  return (
    <LocalPanel
      title="Log"
      label="History"
      actions={
        <Select
          label="Limit"
          options={limitOptions}
          value={String(limit)}
          onChange={(event) => setLimit(Number(event.target.value))}
        />
      }
    >
      <QueryFeedback
        pending={log.isPending}
        error={log.error}
        onRetry={() => void log.refetch()}
      />
      {log.isSuccess && log.data.length === 0 ? <p className="t-label">[NO COMMITS]</p> : null}
      {log.isSuccess && log.data.length > 0 ? (
        <ul className="rows">
          {log.data.map((entry) => {
            const row = logEntryToRow(entry);
            return (
              <CommitRow
                key={entry.hash}
                commit={row}
                avatar
                selected={entry.hash === selectedRev}
                onSelect={(commit) => onSelectCommit(commit.sha)}
              />
            );
          })}
        </ul>
      ) : null}
    </LocalPanel>
  );
}
