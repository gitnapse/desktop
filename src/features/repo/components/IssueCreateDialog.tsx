import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, PenLine } from "lucide-react";
import { Button, Input, Modal, StatusLine } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import { MarkdownField } from "./MarkdownField";

export interface IssueCreateDialogProps {
  open: boolean;
  onClose: () => void;
  repo: string;
  onCreated?: (number: number) => void;
}

export function IssueCreateDialog({ open, onClose, repo, onCreated }: IssueCreateDialogProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () => bridge.createIssue(repo, title.trim(), body.trim() || undefined),
    onSuccess: (issue) => {
      void queryClient.invalidateQueries({ queryKey: ["issues", repo] });
      void queryClient.invalidateQueries({ queryKey: ["repo", repo] });
      onCreated?.(issue.number);
    },
  });

  useEffect(() => {
    if (open) {
      setTitle("");
      setBody("");
      setPreview(false);
      create.reset();
    }
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (title.trim().length > 0 && !create.isPending) {
      create.mutate();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="New issue"
      footer={
        <>
          <Button
            variant="technical"
            icon={preview ? PenLine : Eye}
            onClick={() => setPreview((value) => !value)}
          >
            {preview ? "Write" : "Preview"}
          </Button>
          <Button variant="technical" onClick={onClose}>
            Close
          </Button>
          <Button
            type="submit"
            form="issue-create-form"
            primary
            disabled={title.trim().length === 0 || create.isPending}
          >
            Create
          </Button>
        </>
      }
    >
      <form id="issue-create-form" className="settings-stack" onSubmit={submit}>
        <Input
          label="Title"
          autoFocus
          spellCheck={false}
          placeholder="Short, specific summary"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <MarkdownField label="Body" value={body} onChange={setBody} preview={preview} rows={10} />
        {create.isPending ? <StatusLine kind="loading" /> : null}
        {create.isError ? <StatusLine kind="error" message={create.error.message} /> : null}
        {create.isSuccess ? (
          <StatusLine kind="saved" message={`ISSUE #${create.data.number} CREATED`} />
        ) : null}
      </form>
    </Modal>
  );
}
