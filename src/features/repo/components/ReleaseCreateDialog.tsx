import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, PenLine, Tag } from "lucide-react";
import { Button, Checkbox, Input, Modal, StatusLine } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import { MarkdownField } from "./MarkdownField";

export interface ReleaseCreateDialogProps {
  open: boolean;
  onClose: () => void;
  repo: string;
  defaultBranch: string;
}

export function ReleaseCreateDialog({
  open,
  onClose,
  repo,
  defaultBranch,
}: ReleaseCreateDialogProps) {
  const [tagName, setTagName] = useState("");
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [prerelease, setPrerelease] = useState(false);
  const [preview, setPreview] = useState(false);
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: () =>
      bridge.createRelease(
        repo,
        tagName.trim(),
        name.trim() || undefined,
        body.trim() || undefined,
        prerelease,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["releases", repo] });
    },
  });

  useEffect(() => {
    if (open) {
      setTagName("");
      setName("");
      setBody("");
      setPrerelease(false);
      setPreview(false);
      create.reset();
    }
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (tagName.trim().length > 0 && !create.isPending) {
      create.mutate();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title="New release"
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
            form="release-create-form"
            primary
            icon={Tag}
            disabled={tagName.trim().length === 0 || create.isPending}
          >
            Publish
          </Button>
        </>
      }
    >
      <form id="release-create-form" className="settings-stack" onSubmit={submit}>
        <Input
          label="Tag"
          mono
          autoFocus
          spellCheck={false}
          placeholder="v0.2.0"
          value={tagName}
          onChange={(event) => setTagName(event.target.value)}
        />
        <Input
          label="Release title"
          spellCheck={false}
          placeholder="Optional"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <p className="t-caption">{`Target: ${defaultBranch} (repository default branch)`}</p>
        <MarkdownField label="Notes" value={body} onChange={setBody} preview={preview} rows={8} />
        <Checkbox
          label="Pre-release"
          checked={prerelease}
          onChange={(event) => setPrerelease(event.target.checked)}
        />
        {create.isPending ? <StatusLine kind="loading" /> : null}
        {create.isError ? <StatusLine kind="error" message={create.error.message} /> : null}
        {create.isSuccess ? (
          <StatusLine kind="saved" message={`RELEASE ${create.data.tag_name} PUBLISHED`} />
        ) : null}
      </form>
    </Modal>
  );
}
