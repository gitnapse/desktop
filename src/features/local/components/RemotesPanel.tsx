import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Pencil, Plus, Trash2 } from "lucide-react";
import { Button, IconButton, Input, Modal } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import type { GitRemote } from "../../../lib/types";
import { QueryFeedback } from "../../repo/components/QueryFeedback";
import { localKeys } from "../lib/keys";
import { Feedback, LocalPanel } from "./LocalPanel";

export interface RemotesPanelProps {
  cwd: string;
}

export function RemotesPanel({ cwd }: RemotesPanelProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [renameTarget, setRenameTarget] = useState<GitRemote | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [removeTarget, setRemoveTarget] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const remotes = useQuery({
    queryKey: localKeys.remotes(cwd),
    queryFn: () => bridge.gitRemotes(cwd),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: localKeys.remotes(cwd) });
  };

  const add = useMutation({
    mutationFn: (request: { name: string; url: string }) =>
      bridge.gitRemoteAdd(cwd, request.name, request.url),
    onSuccess: () => {
      setName("");
      setUrl("");
      refresh();
    },
  });
  const rename = useMutation({
    mutationFn: () => bridge.gitRemoteRename(cwd, renameTarget?.name ?? "", renameValue.trim()),
    onSuccess: () => {
      setRenameTarget(null);
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (remoteName: string) => bridge.gitRemoteRemove(cwd, remoteName),
    onSuccess: () => {
      setRemoveTarget(null);
      refresh();
    },
  });

  return (
    <LocalPanel title="Remotes" label="Origins">
      <QueryFeedback
        pending={remotes.isPending}
        error={remotes.error}
        onRetry={() => void remotes.refetch()}
      />
      {remotes.isSuccess && remotes.data.length === 0 ? (
        <p className="t-label">[NO REMOTES]</p>
      ) : null}
      {remotes.isSuccess && remotes.data.length > 0 ? (
        <ul className="rows">
          {remotes.data.map((remote) => (
            <li className="datarow" key={remote.name}>
              <div className="datarow__grow">
                <Globe size={16} strokeWidth={1.5} aria-hidden="true" />
                <span className="datarow__main">
                  <code className="datarow__branch">{remote.name}</code>
                  <span className="datarow__meta">
                    <span>{remote.fetch_url}</span>
                  </span>
                </span>
              </div>
              <span className="datarow__trailing">
                <IconButton
                  icon={Pencil}
                  size="sm"
                  label={`Rename remote ${remote.name}`}
                  onClick={() => {
                    setRenameTarget(remote);
                    setRenameValue(remote.name);
                  }}
                />
                <IconButton
                  icon={Trash2}
                  size="sm"
                  label={`Remove remote ${remote.name}`}
                  onClick={() => setRemoveTarget(remote.name)}
                />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="settings-stack">
        <div className="syncrow">
          <Input
            label="Name"
            mono
            spellCheck={false}
            placeholder="upstream"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            label="URL"
            mono
            spellCheck={false}
            placeholder="https://github.com/owner/name.git"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </div>
        <div className="auth-actions">
          <Button
            variant="technical"
            icon={Plus}
            disabled={name.trim().length === 0 || url.trim().length === 0 || add.isPending}
            onClick={() => add.mutate({ name: name.trim(), url: url.trim() })}
          >
            Add remote
          </Button>
        </div>
      </div>
      <Feedback
        pending={add.isPending || rename.isPending || remove.isPending}
        error={add.error ?? rename.error ?? remove.error}
        saved={
          add.isSuccess && !add.isPending
            ? `REMOTE ${add.variables?.name ?? ""} ADDED`
            : rename.isSuccess && !rename.isPending
              ? "REMOTE RENAMED"
              : remove.isSuccess && !remove.isPending
                ? "REMOTE REMOVED"
                : null
        }
      />

      <Modal
        open={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        title="Rename remote"
        footer={
          <>
            <Button variant="technical" onClick={() => setRenameTarget(null)}>
              Cancel
            </Button>
            <Button
              primary
              disabled={renameValue.trim().length === 0 || rename.isPending}
              onClick={() => rename.mutate()}
            >
              Rename
            </Button>
          </>
        }
      >
        <div className="settings-stack">
          <Input
            label="New name"
            mono
            autoFocus
            spellCheck={false}
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
          />
          <Feedback error={rename.error} />
        </div>
      </Modal>

      <Modal
        open={removeTarget !== null}
        onClose={() => setRemoveTarget(null)}
        title="Remove remote"
        footer={
          <>
            <Button variant="technical" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button
              danger
              primary
              disabled={remove.isPending}
              onClick={() => {
                if (removeTarget) {
                  remove.mutate(removeTarget);
                }
              }}
            >
              Remove
            </Button>
          </>
        }
      >
        <div className="settings-stack">
          <p className="t-body-sm">{`Remove remote ${removeTarget ?? ""}?`}</p>
          <Feedback error={remove.error} />
        </div>
      </Modal>
    </LocalPanel>
  );
}
