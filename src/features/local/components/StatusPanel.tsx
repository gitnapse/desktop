import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Undo2 } from "lucide-react";
import { Button, IconButton, Modal } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import { groupStatus, totalChanges, changeKindLabel, changeKindTone } from "../lib/status";
import type { StatusEntry } from "../lib/status";
import { localKeys } from "../lib/keys";
import { Feedback, LocalPanel } from "./LocalPanel";
import { QueryFeedback } from "../../repo/components/QueryFeedback";
import { StatusDot } from "../../repo/components/StatusDot";

export interface StatusPanelProps {
  cwd: string;
  onSelectPath: (path: string, group: StatusEntry["group"]) => void;
}

export function StatusPanel({ cwd, onSelectPath }: StatusPanelProps) {
  const [discardPaths, setDiscardPaths] = useState<string[] | null>(null);
  const queryClient = useQueryClient();

  const status = useQuery({
    queryKey: localKeys.status(cwd),
    queryFn: () => bridge.gitStatus(cwd),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: localKeys.status(cwd) });
    void queryClient.invalidateQueries({ queryKey: ["git-diff", cwd] });
  };

  const stage = useMutation({
    mutationFn: (paths: string[]) => bridge.gitStage(cwd, paths),
    onSuccess: refresh,
  });
  const unstage = useMutation({
    mutationFn: (paths: string[]) => bridge.gitUnstage(cwd, paths),
    onSuccess: refresh,
  });
  const discard = useMutation({
    mutationFn: (paths: string[]) => bridge.gitDiscard(cwd, paths),
    onSuccess: () => {
      setDiscardPaths(null);
      refresh();
    },
  });

  const mutations = [stage, unstage, discard];
  const pending = mutations.some((entry) => entry.isPending);
  const error = mutations.find((entry) => entry.isError)?.error ?? null;
  const saved =
    stage.isSuccess && !pending
      ? `${stage.variables?.length ?? 0} STAGED`
      : unstage.isSuccess && !pending
        ? `${unstage.variables?.length ?? 0} UNSTAGED`
        : discard.isSuccess && !pending
          ? `${discard.variables?.length ?? 0} DISCARDED`
          : null;

  const groups = status.isSuccess ? groupStatus(status.data) : [];
  const stagedPaths = status.data?.staged.map((entry) => entry.path) ?? [];
  const worktreePaths = [
    ...(status.data?.unstaged.map((entry) => entry.path) ?? []),
    ...(status.data?.untracked ?? []),
    ...(status.data?.conflicted ?? []),
  ];

  function groupActions(groupId: string, entries: StatusEntry[]) {
    const paths = entries.map((entry) => entry.path);
    if (groupId === "staged") {
      return (
        <Button variant="technical" onClick={() => unstage.mutate(paths)}>
          Unstage all
        </Button>
      );
    }
    return (
      <>
        <Button variant="technical" onClick={() => stage.mutate(paths)}>
          Stage all
        </Button>
        <Button variant="technical" danger onClick={() => setDiscardPaths(paths)}>
          Discard all
        </Button>
      </>
    );
  }

  return (
    <LocalPanel
      title="Status"
      label={status.isSuccess ? `${totalChanges(status.data)} CHANGES` : "WORKING TREE"}
    >
      <QueryFeedback
        pending={status.isPending}
        error={status.error}
        onRetry={() => void status.refetch()}
      />
      <Feedback pending={pending} error={error} saved={saved} />
      {status.isSuccess && totalChanges(status.data) === 0 ? (
        <p className="t-label">[CLEAN WORKING TREE]</p>
      ) : null}
      {status.isSuccess && totalChanges(status.data) > 0 ? (
        <div className="filterbar statuspanel__bulk">
          <Button
            variant="technical"
            icon={Plus}
            onClick={() => stage.mutate(worktreePaths)}
            disabled={worktreePaths.length === 0}
          >
            Stage all
          </Button>
          <Button
            variant="technical"
            icon={Undo2}
            onClick={() => unstage.mutate(stagedPaths)}
            disabled={stagedPaths.length === 0}
          >
            Unstage all
          </Button>
          <Button
            variant="technical"
            danger
            icon={Trash2}
            onClick={() => setDiscardPaths([...(status.data.unstaged.map((entry) => entry.path)), ...status.data.untracked])}
            disabled={status.data.unstaged.length === 0 && status.data.untracked.length === 0}
          >
            Discard all
          </Button>
        </div>
      ) : null}

      {groups.map((group) =>
        group.entries.length === 0 ? null : (
          <section className="statusgroup" key={group.id}>
            <header className="statusgroup__head">
              <span className="t-label">{`${group.label} · ${group.entries.length}`}</span>
              <span className="statusgroup__actions">{groupActions(group.id, group.entries)}</span>
            </header>
            <ul className="rows">
              {group.entries.map((entry) => (
                <li className="datarow" key={`${group.id}:${entry.path}`}>
                  <button
                    type="button"
                    className="datarow__grow"
                    onClick={() => onSelectPath(entry.path, entry.group)}
                    aria-label={`Show diff for ${entry.path}`}
                  >
                    <StatusDot tone={changeKindTone(entry.kind)} label={changeKindLabel(entry.kind)} />
                    <span className="datarow__main">
                      <code className="datarow__file">{entry.path}</code>
                      {entry.origPath ? (
                        <span className="datarow__meta">{`from ${entry.origPath}`}</span>
                      ) : null}
                    </span>
                  </button>
                  <span className="datarow__trailing">
                    {group.id !== "staged" ? (
                      <IconButton
                        icon={Plus}
                        size="sm"
                        label={`Stage ${entry.path}`}
                        onClick={() => stage.mutate([entry.path])}
                      />
                    ) : null}
                    {group.id === "staged" || group.id === "conflicted" ? (
                      <IconButton
                        icon={Undo2}
                        size="sm"
                        label={`Unstage ${entry.path}`}
                        onClick={() => unstage.mutate([entry.path])}
                      />
                    ) : null}
                    {group.id !== "staged" ? (
                      <IconButton
                        icon={Trash2}
                        size="sm"
                        label={`Discard changes in ${entry.path}`}
                        onClick={() => setDiscardPaths([entry.path])}
                      />
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ),
      )}

      <Modal
        open={discardPaths !== null}
        onClose={() => setDiscardPaths(null)}
        title="Discard changes"
        footer={
          <>
            <Button variant="technical" onClick={() => setDiscardPaths(null)}>
              Cancel
            </Button>
            <Button
              danger
              primary
              disabled={discard.isPending}
              onClick={() => {
                if (discardPaths) {
                  discard.mutate(discardPaths);
                }
              }}
            >
              Discard
            </Button>
          </>
        }
      >
        <p className="t-body-sm">
          {`Discard local changes in ${discardPaths?.length ?? 0} file(s)? This cannot be undone.`}
        </p>
        <Feedback error={discard.error} />
      </Modal>
    </LocalPanel>
  );
}
