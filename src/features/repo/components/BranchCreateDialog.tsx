import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { GitBranchPlus, GitPullRequestCreate } from "lucide-react";
import { Button, Input, Modal, Select, StatusLine } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import { loadLocalCwd } from "../../local/lib/storage";

export interface BranchCreateDialogProps {
  open: boolean;
  onClose: () => void;
  repo: string;
  defaultBranch: string;
  branches: readonly string[];
}

export function BranchCreateDialog({
  open,
  onClose,
  repo,
  defaultBranch,
  branches,
}: BranchCreateDialogProps) {
  const [name, setName] = useState("");
  const [from, setFrom] = useState(defaultBranch);
  const navigate = useNavigate();
  const cwd = useMemo(() => (open ? loadLocalCwd() : null), [open]);

  const create = useMutation({
    mutationFn: () => bridge.gitBranchCreate(cwd ?? "", name.trim(), from || undefined),
  });

  useEffect(() => {
    if (open) {
      setName("");
      setFrom(defaultBranch);
      create.reset();
    }
  }, [open, defaultBranch]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (cwd && name.trim().length > 0 && !create.isPending) {
      create.mutate();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create branch"
      footer={
        <>
          <Button variant="technical" onClick={onClose}>
            Close
          </Button>
          <Button
            type="submit"
            form="branch-create-form"
            icon={GitBranchPlus}
            primary
            disabled={!cwd || name.trim().length === 0 || create.isPending}
          >
            Create locally
          </Button>
        </>
      }
    >
      <form id="branch-create-form" className="settings-stack" onSubmit={submit}>
        <p className="t-caption">{`Branch operations run against a local clone of ${repo}.`}</p>
        {cwd ? (
          <p className="t-label repo-clone__path">{`LOCAL: ${cwd}`}</p>
        ) : (
          <>
            <StatusLine kind="warn" message="NO LOCAL REPOSITORY OPEN" />
            <div className="auth-actions">
              <Button
                variant="technical"
                icon={GitBranchPlus}
                onClick={() => {
                  onClose();
                  navigate("/local");
                }}
              >
                Open local repository
              </Button>
            </div>
          </>
        )}
        <Input
          label="Branch name"
          mono
          autoFocus
          spellCheck={false}
          placeholder="feat/new-topic"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Select
          label="From"
          options={branches.map((branch) => ({ value: branch, label: branch }))}
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
        {create.isPending ? <StatusLine kind="loading" /> : null}
        {create.isError ? <StatusLine kind="error" message={create.error.message} /> : null}
        {create.isSuccess ? <StatusLine kind="saved" message={`BRANCH ${name.trim()} CREATED`} /> : null}
        <div className="authblock">
          <p className="t-label">Remote branch</p>
          <p className="t-caption">
            Branches on GitHub are created through the pull request flow.
          </p>
          <div className="auth-actions">
            <Button
              variant="technical"
              icon={GitPullRequestCreate}
              onClick={() => {
                onClose();
                navigate("pulls?new=1");
              }}
            >
              Create pull request
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
}
