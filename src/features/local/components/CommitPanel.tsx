import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GitCommitHorizontal } from "lucide-react";
import { Button, Checkbox, Textarea } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import { localKeys } from "../lib/keys";
import { Feedback, LocalPanel } from "./LocalPanel";

export interface CommitPanelProps {
  cwd: string;
}

export function CommitPanel({ cwd }: CommitPanelProps) {
  const [message, setMessage] = useState("");
  const [all, setAll] = useState(false);
  const queryClient = useQueryClient();

  const commit = useMutation({
    mutationFn: () => bridge.gitCommit(cwd, message.trim(), all || undefined),
    onSuccess: () => {
      setMessage("");
      void queryClient.invalidateQueries({ queryKey: localKeys.status(cwd) });
      void queryClient.invalidateQueries({ queryKey: localKeys.log(cwd) });
      void queryClient.invalidateQueries({ queryKey: ["git-diff", cwd] });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (message.trim().length > 0 && !commit.isPending) {
      commit.mutate();
    }
  }

  return (
    <LocalPanel title="Commit" label="New change">
      <form className="settings-stack" onSubmit={submit}>
        <Textarea
          label="Message"
          rows={4}
          value={message}
          placeholder="Commit message"
          onChange={(event) => setMessage(event.target.value)}
        />
        <Checkbox
          label="Stage all tracked changes"
          description="git commit -a"
          checked={all}
          onChange={(event) => setAll(event.target.checked)}
        />
        <Feedback
          pending={commit.isPending}
          error={commit.error}
          saved={commit.isSuccess ? `COMMITTED ${commit.data.slice(0, 7)}` : null}
        />
        <div className="auth-actions">
          <Button
            type="submit"
            primary
            icon={GitCommitHorizontal}
            disabled={message.trim().length === 0 || commit.isPending}
          >
            Commit
          </Button>
        </div>
      </form>
    </LocalPanel>
  );
}
