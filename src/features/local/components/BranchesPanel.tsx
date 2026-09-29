import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Copy, GitBranch, GitMerge, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Checkbox, IconButton, Input, Modal } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import type { GitBranch as GitBranchDto } from "../../../lib/types";
import { QueryFeedback } from "../../repo/components/QueryFeedback";
import { localKeys } from "../lib/keys";
import { Feedback, LocalPanel } from "./LocalPanel";
import { useCopy } from "../../repo/lib/useCopy";

export interface BranchesPanelProps {
  cwd: string;
}

interface BranchRowProps {
  branch: GitBranchDto;
  onCheckout: (name: string) => void;
  onMerge: (name: string) => void;
  onDelete: (name: string) => void;
  busy: boolean;
}

function BranchRow({ branch, onCheckout, onMerge, onDelete, busy }: BranchRowProps) {
  const { copied, copy } = useCopy();
  return (
    <li className="datarow">
      <div className="datarow__grow">
        <GitBranch size={16} strokeWidth={1.5} aria-hidden="true" />
        <span className="datarow__main">
          <code className="datarow__branch">{branch.name}</code>
          <span className="datarow__meta">
            {branch.upstream ? <span>{branch.upstream}</span> : null}
            {branch.ahead > 0 ? <span>{`ahead ${branch.ahead}`}</span> : null}
            {branch.behind > 0 ? <span>{`behind ${branch.behind}`}</span> : null}
          </span>
        </span>
        {branch.current ? <Badge tone="ok">Current</Badge> : null}
      </div>
      <span className="datarow__trailing">
        <IconButton
          icon={copied ? Check : Copy}
          size="sm"
          label={copied ? `Branch ${branch.name} copied` : `Copy branch name ${branch.name}`}
          onClick={() => copy(branch.name)}
        />
        {!branch.current ? (
          <>
            <Button
              variant="technical"
              disabled={busy}
              onClick={() => onCheckout(branch.name)}
            >
              Checkout
            </Button>
            <IconButton
              icon={GitMerge}
              size="sm"
              label={`Merge ${branch.name} into the current branch`}
              disabled={busy}
              onClick={() => onMerge(branch.name)}
            />
            <IconButton
              icon={Trash2}
              size="sm"
              label={`Delete branch ${branch.name}`}
              disabled={busy}
              onClick={() => onDelete(branch.name)}
            />
          </>
        ) : null}
      </span>
    </li>
  );
}

export function BranchesPanel({ cwd }: BranchesPanelProps) {
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [deleteName, setDeleteName] = useState<string | null>(null);
  const [deleteForce, setDeleteForce] = useState(false);
  const queryClient = useQueryClient();

  const branches = useQuery({
    queryKey: localKeys.branches(cwd),
    queryFn: () => bridge.gitBranches(cwd),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: localKeys.branches(cwd) });
    void queryClient.invalidateQueries({ queryKey: localKeys.status(cwd) });
    void queryClient.invalidateQueries({ queryKey: localKeys.log(cwd) });
  };

  const create = useMutation({
    mutationFn: () => bridge.gitBranchCreate(cwd, name.trim(), from.trim() || undefined),
    onSuccess: () => {
      setName("");
      refresh();
    },
  });
  const checkout = useMutation({
    mutationFn: (branchName: string) => bridge.gitCheckout(cwd, branchName),
    onSuccess: refresh,
  });
  const merge = useMutation({
    mutationFn: (branchName: string) => bridge.gitMerge(cwd, branchName),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (branchName: string) => bridge.gitBranchDelete(cwd, branchName, deleteForce || undefined),
    onSuccess: () => {
      setDeleteName(null);
      setDeleteForce(false);
      refresh();
    },
  });

  const busy = checkout.isPending || merge.isPending || remove.isPending;

  return (
    <LocalPanel title="Branches" label="Refs">
      <QueryFeedback
        pending={branches.isPending}
        error={branches.error}
        onRetry={() => void branches.refetch()}
      />
      {branches.isSuccess && branches.data.length === 0 ? (
        <p className="t-label">[NO BRANCHES]</p>
      ) : null}
      {branches.isSuccess && branches.data.length > 0 ? (
        <ul className="rows">
          {branches.data.map((branch) => (
            <BranchRow
              key={branch.name}
              branch={branch}
              busy={busy}
              onCheckout={(value) => checkout.mutate(value)}
              onMerge={(value) => merge.mutate(value)}
              onDelete={(value) => setDeleteName(value)}
            />
          ))}
        </ul>
      ) : null}
      <div className="settings-stack">
        <div className="syncrow">
          <Input
            label="New branch"
            mono
            spellCheck={false}
            placeholder="feat/topic"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            label="From"
            mono
            spellCheck={false}
            placeholder="HEAD"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div className="auth-actions">
          <Button
            variant="technical"
            icon={Plus}
            disabled={name.trim().length === 0 || create.isPending}
            onClick={() => create.mutate()}
          >
            Create
          </Button>
        </div>
      </div>
      <Feedback
        pending={create.isPending || checkout.isPending}
        error={create.error ?? checkout.error}
        saved={
          create.isSuccess && !create.isPending
            ? `BRANCH ${create.variables ?? ""} CREATED`
            : checkout.isSuccess && !checkout.isPending
              ? `CHECKED OUT ${checkout.variables ?? ""}`
              : null
        }
      />
      <Feedback
        pending={merge.isPending || remove.isPending}
        error={merge.error ?? remove.error}
        saved={
          merge.isSuccess && !merge.isPending
            ? merge.data.trim().split("\n")[0]?.slice(0, 80) ?? null
            : remove.isSuccess && !remove.isPending
              ? `BRANCH ${remove.variables ?? ""} DELETED`
              : null
        }
      />

      <Modal
        open={deleteName !== null}
        onClose={() => setDeleteName(null)}
        title="Delete branch"
        footer={
          <>
            <Button variant="technical" onClick={() => setDeleteName(null)}>
              Cancel
            </Button>
            <Button
              danger
              primary
              disabled={remove.isPending}
              onClick={() => {
                if (deleteName) {
                  remove.mutate(deleteName);
                }
              }}
            >
              Delete
            </Button>
          </>
        }
      >
        <div className="settings-stack">
          <p className="t-body-sm">{`Delete branch ${deleteName ?? ""}?`}</p>
          <Checkbox
            label="Force delete"
            description="for unmerged branches"
            checked={deleteForce}
            onChange={(event) => setDeleteForce(event.target.checked)}
          />
          <Feedback error={remove.error} />
        </div>
      </Modal>
    </LocalPanel>
  );
}
