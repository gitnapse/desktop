import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, PenLine } from "lucide-react";
import { Button, Input, Modal, Select, StatusLine } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import { MarkdownField } from "./MarkdownField";

export interface PullCreateDialogProps {
  open: boolean;
  onClose: () => void;
  repo: string;
  defaultBase: string;
  branches: readonly string[];
  onCreated: (number: number) => void;
}

export function PullCreateDialog({
  open,
  onClose,
  repo,
  defaultBase,
  branches,
  onCreated,
}: PullCreateDialogProps) {
  const [title, setTitle] = useState("");
  const [head, setHead] = useState("");
  const [base, setBase] = useState(defaultBase);
  const [body, setBody] = useState("");
  const [preview, setPreview] = useState(false);
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () => bridge.createPullRequest(repo, title.trim(), head, base, body.trim() || undefined),
    onSuccess: (pull) => {
      void queryClient.invalidateQueries({ queryKey: ["pulls", repo] });
      onCreated(pull.number);
    },
  });

  useEffect(() => {
    if (open) {
      setTitle("");
      setHead("");
      setBase(defaultBase);
      setBody("");
      setPreview(false);
      create.reset();
    }
  }, [open, defaultBase]);

  const branchOptions = branches.map((branch) => ({ value: branch, label: branch }));
  const valid = title.trim().length > 0 && head.length > 0 && base.length > 0 && head !== base;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (valid && !create.isPending) {
      create.mutate();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="New pull request"
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
            form="pull-create-form"
            primary
            disabled={!valid || create.isPending}
          >
            Create
          </Button>
        </>
      }
    >
      <form id="pull-create-form" className="settings-stack" onSubmit={submit}>
        <Input
          label="Title"
          autoFocus
          spellCheck={false}
          placeholder="What changed and why"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
        <div className="pull-form__refs">
          <Select
            label="Head branch"
            placeholder="Select branch"
            options={branchOptions}
            value={head}
            onChange={(event) => setHead(event.target.value)}
          />
          <Select
            label="Base branch"
            options={branchOptions}
            value={base}
            onChange={(event) => setBase(event.target.value)}
          />
        </div>
        {head.length > 0 && base.length > 0 && head === base ? (
          <StatusLine kind="warn" message="HEAD AND BASE MUST DIFFER" />
        ) : null}
        <MarkdownField label="Body" value={body} onChange={setBody} preview={preview} rows={10} />
        {create.isPending ? <StatusLine kind="loading" /> : null}
        {create.isError ? <StatusLine kind="error" message={create.error.message} /> : null}
        {create.isSuccess ? (
          <StatusLine kind="saved" message={`PULL #${create.data.number} CREATED`} />
        ) : null}
      </form>
    </Modal>
  );
}
