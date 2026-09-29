import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CloudDownload, Download, Upload } from "lucide-react";
import { Button, Checkbox, Input, Modal, Select } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import { localKeys } from "../lib/keys";
import { Feedback, LocalPanel } from "./LocalPanel";

export interface SyncPanelProps {
  cwd: string;
  branch: string | null;
}

function firstLine(value: string): string {
  const line = value.split("\n").find((entry) => entry.trim().length > 0);
  return (line ?? value).trim().slice(0, 80);
}

export function SyncPanel({ cwd, branch }: SyncPanelProps) {
  const [rebase, setRebase] = useState(false);
  const [remote, setRemote] = useState("origin");
  const [pushBranch, setPushBranch] = useState(branch ?? "");
  const [force, setForce] = useState(false);
  const [upstream, setUpstream] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setPushBranch(branch ?? "");
  }, [branch]);

  const remotes = useQuery({
    queryKey: localKeys.remotes(cwd),
    queryFn: () => bridge.gitRemotes(cwd),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: localKeys.status(cwd) });
    void queryClient.invalidateQueries({ queryKey: localKeys.branches(cwd) });
    void queryClient.invalidateQueries({ queryKey: localKeys.log(cwd) });
  };

  const fetch = useMutation({
    mutationFn: () => bridge.gitFetch(cwd),
    onSuccess: refresh,
  });
  const pull = useMutation({
    mutationFn: () => bridge.gitPull(cwd, rebase || undefined),
    onSuccess: refresh,
  });
  const push = useMutation({
    mutationFn: () =>
      bridge.gitPush(cwd, remote || undefined, pushBranch.trim() || undefined, force || undefined, upstream || undefined),
    onSuccess: () => {
      setConfirmOpen(false);
      refresh();
    },
  });

  const remoteOptions = (remotes.data ?? []).map((entry) => ({
    value: entry.name,
    label: entry.name,
  }));

  return (
    <LocalPanel title="Sync" label="Remote">
      <div className="syncrow">
        <Button
          variant="technical"
          icon={CloudDownload}
          disabled={fetch.isPending}
          onClick={() => fetch.mutate()}
        >
          Fetch
        </Button>
        <Feedback pending={fetch.isPending} error={fetch.error} saved={fetch.isSuccess ? firstLine(fetch.data) : null} />
      </div>

      <div className="syncrow">
        <Button
          variant="technical"
          icon={Download}
          disabled={pull.isPending}
          onClick={() => pull.mutate()}
        >
          Pull
        </Button>
        <Checkbox
          label="Rebase"
          checked={rebase}
          onChange={(event) => setRebase(event.target.checked)}
        />
        <Feedback pending={pull.isPending} error={pull.error} saved={pull.isSuccess ? firstLine(pull.data) : null} />
      </div>

      <div className="settings-stack syncpush">
        <div className="syncrow">
          <Select
            label="Remote"
            options={remoteOptions.length > 0 ? remoteOptions : [{ value: remote, label: remote }]}
            value={remote}
            onChange={(event) => setRemote(event.target.value)}
          />
          <Input
            label="Branch"
            mono
            spellCheck={false}
            value={pushBranch}
            onChange={(event) => setPushBranch(event.target.value)}
          />
        </div>
        <div className="syncrow">
          <Checkbox
            label="Set upstream"
            checked={upstream}
            onChange={(event) => setUpstream(event.target.checked)}
          />
          <Checkbox
            label="Force"
            checked={force}
            onChange={(event) => setForce(event.target.checked)}
          />
          <Button
            variant="technical"
            icon={Upload}
            danger={force}
            disabled={push.isPending}
            onClick={() => {
              if (force) {
                setConfirmOpen(true);
              } else {
                push.mutate();
              }
            }}
          >
            Push
          </Button>
        </div>
        <Feedback pending={push.isPending} error={push.error} saved={push.isSuccess ? firstLine(push.data) : null} />
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Force push"
        footer={
          <>
            <Button variant="technical" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              danger
              primary
              disabled={push.isPending}
              onClick={() => push.mutate()}
            >
              Force push
            </Button>
          </>
        }
      >
        <p className="t-body-sm">
          {`Force push ${pushBranch || "the current branch"} to ${remote || "origin"}? Remote history may be overwritten.`}
        </p>
        <Feedback error={push.error} />
      </Modal>
    </LocalPanel>
  );
}
