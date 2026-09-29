import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GitMerge } from "lucide-react";
import { Button, Input, Modal, Select, StatusLine } from "../../../ui";
import * as bridge from "../../../lib/bridge";

export interface MergePullDialogProps {
  open: boolean;
  onClose: () => void;
  repo: string;
  number: number;
}

const methods = [
  { value: "merge", label: "Merge commit" },
  { value: "squash", label: "Squash" },
  { value: "rebase", label: "Rebase" },
];

export function MergePullDialog({ open, onClose, repo, number }: MergePullDialogProps) {
  const [method, setMethod] = useState("merge");
  const [commitTitle, setCommitTitle] = useState("");
  const queryClient = useQueryClient();

  const merge = useMutation({
    mutationFn: () =>
      bridge.mergePullRequest(repo, number, commitTitle.trim() || undefined, method),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pull", repo, number] });
      void queryClient.invalidateQueries({ queryKey: ["pulls", repo] });
    },
  });

  useEffect(() => {
    if (open) {
      setMethod("merge");
      setCommitTitle("");
      merge.reset();
    }
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!merge.isPending && !merge.isSuccess) {
      merge.mutate();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Merge pull request #${number}`}
      footer={
        <>
          <Button variant="technical" onClick={onClose}>
            Close
          </Button>
          <Button
            type="submit"
            form="merge-pull-form"
            primary
            icon={GitMerge}
            disabled={merge.isPending || merge.isSuccess}
          >
            Merge
          </Button>
        </>
      }
    >
      <form id="merge-pull-form" className="settings-stack" onSubmit={submit}>
        <Select
          label="Method"
          options={methods}
          value={method}
          onChange={(event) => setMethod(event.target.value)}
        />
        <Input
          label="Commit title"
          spellCheck={false}
          placeholder="Optional"
          value={commitTitle}
          onChange={(event) => setCommitTitle(event.target.value)}
        />
        {merge.isPending ? <StatusLine kind="loading" /> : null}
        {merge.isError ? <StatusLine kind="error" message={merge.error.message} /> : null}
        {merge.isSuccess ? <StatusLine kind="saved" message={merge.data.message} /> : null}
      </form>
    </Modal>
  );
}
