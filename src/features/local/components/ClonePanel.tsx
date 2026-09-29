import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FolderGit2, FolderSearch } from "lucide-react";
import { Button, Input, ProgressBar, StatusLine } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import type { CloneProgress } from "../../../lib/types";
import { Feedback, LocalPanel } from "./LocalPanel";

export interface ClonePanelProps {
  onOpen: (cwd: string) => void;
}

export function ClonePanel({ onOpen }: ClonePanelProps) {
  const [spec, setSpec] = useState("");
  const [dirOverride, setDirOverride] = useState<string | null>(null);
  const [branch, setBranch] = useState("");
  const [progress, setProgress] = useState<CloneProgress | null>(null);
  const [existingDir, setExistingDir] = useState("");
  const cloneDir = useQuery({ queryKey: ["clone-dir"], queryFn: bridge.cloneDir });

  const clone = useMutation({
    mutationFn: () =>
      bridge.cloneRepo(spec.trim(), dirOverride?.trim() || undefined, branch.trim() || undefined),
    onSuccess: (result) => {
      setProgress(null);
      onOpen(result.path);
    },
  });

  const openExisting = useMutation({
    mutationFn: () => bridge.gitRepoInfo(existingDir.trim()),
    onSuccess: () => onOpen(existingDir.trim()),
  });

  useEffect(() => {
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
  }, []);

  const dir = dirOverride ?? cloneDir.data ?? "";

  async function chooseDirectory(target: "clone" | "open") {
    const picked = await bridge.pickDirectory();
    if (!picked) {
      return;
    }
    if (target === "clone") {
      setDirOverride(picked);
      void bridge.setCloneDir(picked);
    } else {
      setExistingDir(picked);
    }
  }

  function submitClone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (spec.trim().length > 0 && !clone.isPending) {
      clone.mutate();
    }
  }

  function submitOpen(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (existingDir.trim().length > 0 && !openExisting.isPending) {
      openExisting.mutate();
    }
  }

  return (
    <div className="clone-grid">
      <LocalPanel title="Clone repository" label="Remote">
        <form className="settings-stack" onSubmit={submitClone}>
          <Input
            label="Repository"
            mono
            spellCheck={false}
            placeholder="owner/name or https://github.com/owner/name"
            value={spec}
            onChange={(event) => setSpec(event.target.value)}
          />
          <div className="clone-grid__dir">
            <Input
              label="Directory"
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
                void chooseDirectory("clone");
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
          <Feedback error={clone.error} />
          <div className="auth-actions">
            <Button
              type="submit"
              primary
              icon={FolderGit2}
              disabled={spec.trim().length === 0 || clone.isPending}
            >
              Clone
            </Button>
          </div>
        </form>
      </LocalPanel>

      <LocalPanel title="Open existing repository" label="Local">
        <form className="settings-stack" onSubmit={submitOpen}>
          <div className="clone-grid__dir">
            <Input
              label="Directory"
              mono
              spellCheck={false}
              placeholder="/path/to/repository"
              value={existingDir}
              onChange={(event) => setExistingDir(event.target.value)}
            />
            <Button
              variant="technical"
              icon={FolderSearch}
              onClick={() => {
                void chooseDirectory("open");
              }}
            >
              Choose
            </Button>
          </div>
          <Feedback pending={openExisting.isPending} error={openExisting.error} />
          <div className="auth-actions">
            <Button
              type="submit"
              icon={FolderGit2}
              disabled={existingDir.trim().length === 0 || openExisting.isPending}
            >
              Open repository
            </Button>
          </div>
        </form>
      </LocalPanel>
    </div>
  );
}
