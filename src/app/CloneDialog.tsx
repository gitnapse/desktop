import { useEffect, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button, Input, Modal, StatusLine } from "../ui";
import * as bridge from "../lib/bridge";

export interface CloneDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CloneDialog({ open, onClose }: CloneDialogProps) {
  const [spec, setSpec] = useState("");
  const [branch, setBranch] = useState("");

  const clone = useMutation({
    mutationFn: (request: { spec: string; branch?: string }) =>
      bridge.cloneRepo(request.spec, undefined, request.branch),
  });

  useEffect(() => {
    if (open) {
      setSpec("");
      setBranch("");
      clone.reset();
    }
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = spec.trim();
    if (value.length === 0) {
      return;
    }
    clone.mutate({ spec: value, branch: branch.trim() || undefined });
  }

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
            form="clone-form"
            primary
            disabled={spec.trim().length === 0 || clone.isPending}
          >
            Clone
          </Button>
        </>
      }
    >
      <form id="clone-form" className="settings-stack" onSubmit={submit}>
        <Input
          label="Repository"
          mono
          autoFocus
          spellCheck={false}
          placeholder="owner/name or https://github.com/owner/name"
          value={spec}
          onChange={(event) => setSpec(event.target.value)}
        />
        <Input
          label="Branch"
          mono
          spellCheck={false}
          placeholder="default branch"
          value={branch}
          onChange={(event) => setBranch(event.target.value)}
        />
        {clone.isPending ? <StatusLine kind="loading" /> : null}
        {clone.isError ? <StatusLine kind="error" message={clone.error.message} /> : null}
        {clone.isSuccess ? (
          <>
            <StatusLine kind="saved" message={clone.data.path} />
            {clone.data.full_name ? (
              <p className="t-caption">{clone.data.full_name}</p>
            ) : null}
          </>
        ) : null}
      </form>
    </Modal>
  );
}
