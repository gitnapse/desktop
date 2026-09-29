import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button, Input } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import type { GitDiffMode } from "../../../lib/types";
import { DiffView } from "../../repo/components/DiffView";
import { QueryFeedback } from "../../repo/components/QueryFeedback";
import { diffTargetLabel, type DiffTarget } from "../lib/status";
import { localKeys } from "../lib/keys";
import { LocalPanel } from "./LocalPanel";

export interface DiffPanelProps {
  cwd: string;
  target: DiffTarget;
  onTargetChange: (target: DiffTarget) => void;
}

function toMode(target: DiffTarget): GitDiffMode {
  switch (target.mode) {
    case "worktree":
      return { kind: "worktree", path: target.path ?? undefined };
    case "staged":
      return { kind: "staged", path: target.path ?? undefined };
    case "commit":
      return { kind: "commit", rev: target.rev ?? "HEAD" };
    case "range":
      return { kind: "range", from: target.from ?? "HEAD~1", to: target.to ?? "HEAD" };
  }
}

export function DiffPanel({ cwd, target, onTargetChange }: DiffPanelProps) {
  const [from, setFrom] = useState(target.from ?? "");
  const [to, setTo] = useState(target.to ?? "");

  const diff = useQuery({
    queryKey: localKeys.diff(cwd, target),
    queryFn: () => bridge.gitDiff(cwd, toMode(target)),
  });

  return (
    <LocalPanel
      title="Diff"
      label={diffTargetLabel(target)}
      actions={
        <Button
          variant="technical"
          icon={RefreshCw}
          onClick={() => void diff.refetch()}
          disabled={diff.isFetching}
        >
          Refresh
        </Button>
      }
    >
      <div className="difftoolbar">
        <div className="difftoolbar__modes">
          <Button
            variant="technical"
            aria-pressed={target.mode === "worktree"}
            onClick={() => onTargetChange({ mode: "worktree", path: target.path })}
          >
            Worktree
          </Button>
          <Button
            variant="technical"
            aria-pressed={target.mode === "staged"}
            onClick={() => onTargetChange({ mode: "staged", path: target.path })}
          >
            Staged
          </Button>
          {target.mode === "commit" ? (
            <Button variant="technical" aria-pressed onClick={() => onTargetChange({ mode: "worktree" })}>
              {`Commit ${(target.rev ?? "HEAD").slice(0, 7)}`}
            </Button>
          ) : null}
        </div>
        <div className="difftoolbar__range">
          <Input
            label="From"
            mono
            spellCheck={false}
            placeholder="HEAD~1"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
          <Input
            label="To"
            mono
            spellCheck={false}
            placeholder="HEAD"
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
          <Button
            variant="technical"
            disabled={from.trim().length === 0 || to.trim().length === 0}
            onClick={() => onTargetChange({ mode: "range", from: from.trim(), to: to.trim() })}
          >
            Diff range
          </Button>
        </div>
      </div>
      <QueryFeedback
        pending={diff.isPending}
        error={diff.error}
        onRetry={() => void diff.refetch()}
      />
      {diff.isSuccess ? <DiffView diff={diff.data} emptyLabel="NO CHANGES" /> : null}
    </LocalPanel>
  );
}
