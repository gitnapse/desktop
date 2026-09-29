import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FolderOpen, FolderSearch } from "lucide-react";
import { Button, Input, Modal, ProgressBar, StatusLine } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import type { CloneProgress } from "../../../lib/types";
import { saveLocalCwd } from "../../local/lib/storage";

export interface CloneRepoDialogProps {
  open: boolean;
  onClose: () => void;
  spec: string;
}

export function CloneRepoDialog({ open, onClose, spec }: CloneRepoDialogProps) {
  const [repository, setRepository] = useState(spec);
  const [dirOverride, setDirOverride] = useState<string | null>(null);
  const [branch, setBranch] = useState("");
  const [progress, setProgress] = useState<CloneProgress | null>(null);
  const cloneDir = useQuery({ queryKey: ["clone-dir"], queryFn: bridge.cloneDir });
  const navigate = useNavigate();

  const clone = useMutation({
    mutationFn: () =>
      bridge.cloneRepo(
        repository.trim(),
        dirOverride?.trim() || undefined,
        branch.trim() || undefined,
      ),
  });

  useEffect(() => {
    if (open) {
      setRepository(spec);
      setDirOverride(null);
      setBranch("");
      setProgress(null);
      clone.reset();
    }
  }, [open, spec]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let active = true;
    let unlisten: (() => void) | null = null;
    void bridge.onCloneProgress((event) => setProgress(event)).then((off) => {
      if (active) {
        unlisten = off;
      } else {
        off();
      }
    });
    return () => {
      active = false;
      unlisten?.();
    };
  }, [open]);

  async function chooseDirectory() {
    const picked = await bridge.pickDirectory();
    if (picked) {
      setDirOverride(picked);
      void bridge.setCloneDir(picked);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (repository.trim().length > 0 && !clone.isPending) {
      clone.mutate();
    }
  }

  const dir = dirOverride ?? cloneDir.data ?? "";
  const result = clone.data;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Clone repository"
      footer={
        <>
          <Button variant="technical" onClick={onClose}>
            Close
          </Button>
          <Button
            type="submit"
            form="repo-clone-form"
            primary
            disabled={repository.trim().length === 0 || clone.isPending}
          >
            Clone
          </Button>
        </>
      }
    >
      <form id="repo-clone-form" className="settings-stack" onSubmit={submit}>
        <Input
          label="Repository"
          mono
          autoFocus
          spellCheck={false}
          placeholder="owner/name or https://github.com/owner/name"
          value={repository}
          onChange={(event) => setRepository(event.target.value)}
        />
        <div className="repo-clone__dir">
          <Input
            label="Destination"
            mono
            spellCheck={false}
            value={dir}
            placeholder={cloneDir.isPending ? "Loading…" : "Default clone directory"}
            onChange={(event) => setDirOverride(event.target.value)}
          />
          <Button
            variant="technical"
            icon={FolderSearch}
            onClick={() => {
              void chooseDirectory();
            }}
          >
            Choose
          </Button>
        </div>
        <Input
          label="Branch"
          mono
          spellCheck={false}
          placeholder="default branch"
          value={branch}
          onChange={(event) => setBranch(event.target.value)}
        />
        {clone.isPending ? (
          <>
            <ProgressBar value={progress?.percent ?? null} label="Clone progress" />
            <StatusLine
              kind="loading"
              message={progress ? `${progress.phase} — ${progress.message}` : "CLONING"}
            />
          </>
        ) : null}
        {clone.isError ? <StatusLine kind="error" message={clone.error.message} /> : null}
        {result ? (
          <>
            <StatusLine kind="saved" message={result.path} />
            <div className="auth-actions">
              <Button
                icon={FolderOpen}
                primary
                onClick={() => {
                  saveLocalCwd(result.path);
                  onClose();
                  navigate("/local");
                }}
              >
                Open repository
              </Button>
              <Button
                variant="technical"
                onClick={() => {
                  void bridge.openInFileManager(result.path);
                }}
              >
                Show folder
              </Button>
            </div>
          </>
        ) : null}
      </form>
    </Modal>
  );
}
