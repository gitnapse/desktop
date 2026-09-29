import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowUpFromLine, Plus } from "lucide-react";
import { Button, IconButton, Input, RelativeTime } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import { QueryFeedback } from "../../repo/components/QueryFeedback";
import { localKeys } from "../lib/keys";
import { Feedback, LocalPanel } from "./LocalPanel";

export interface StashPanelProps {
  cwd: string;
}

export function StashPanel({ cwd }: StashPanelProps) {
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const stash = useQuery({
    queryKey: localKeys.stash(cwd),
    queryFn: () => bridge.gitStashList(cwd),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: localKeys.stash(cwd) });
    void queryClient.invalidateQueries({ queryKey: localKeys.status(cwd) });
    void queryClient.invalidateQueries({ queryKey: ["git-diff", cwd] });
  };

  const push = useMutation({
    mutationFn: () => bridge.gitStashPush(cwd, message.trim() || undefined),
    onSuccess: () => {
      setMessage("");
      refresh();
    },
  });
  const pop = useMutation({
    mutationFn: (index: number) => bridge.gitStashPop(cwd, index),
    onSuccess: refresh,
  });
  const drop = useMutation({
    mutationFn: (index: number) => bridge.gitStashDrop(cwd, index),
    onSuccess: refresh,
  });

  return (
    <LocalPanel title="Stash" label="Shelved work">
      <QueryFeedback
        pending={stash.isPending}
        error={stash.error}
        onRetry={() => void stash.refetch()}
      />
      {stash.isSuccess && stash.data.length === 0 ? (
        <p className="t-label">[NO STASH ENTRIES]</p>
      ) : null}
      {stash.isSuccess && stash.data.length > 0 ? (
        <ul className="rows">
          {stash.data.map((entry) => (
            <li className="datarow" key={entry.name}>
              <div className="datarow__grow">
                <Archive size={16} strokeWidth={1.5} aria-hidden="true" />
                <span className="datarow__main">
                  <span className="datarow__title">{entry.message}</span>
                  <span className="datarow__meta">
                    <code>{entry.name}</code>
                    <RelativeTime value={entry.date} />
                  </span>
                </span>
              </div>
              <span className="datarow__trailing">
                <IconButton
                  icon={ArrowUpFromLine}
                  size="sm"
                  label={`Pop ${entry.name}`}
                  disabled={pop.isPending}
                  onClick={() => pop.mutate(entry.index)}
                />
                <IconButton
                  icon={Archive}
                  size="sm"
                  label={`Drop ${entry.name}`}
                  disabled={drop.isPending}
                  onClick={() => drop.mutate(entry.index)}
                />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="settings-stack">
        <Input
          label="Stash message"
          spellCheck={false}
          placeholder="WIP"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
        />
        <div className="auth-actions">
          <Button
            variant="technical"
            icon={Plus}
            disabled={push.isPending}
            onClick={() => push.mutate()}
          >
            Stash changes
          </Button>
        </div>
      </div>
      <Feedback
        pending={push.isPending || pop.isPending || drop.isPending}
        error={push.error ?? pop.error ?? drop.error}
        saved={
          push.isSuccess && !push.isPending
            ? "STASHED"
            : pop.isSuccess && !pop.isPending
              ? `POPPED stash@{${pop.variables ?? 0}}`
              : drop.isSuccess && !drop.isPending
                ? `DROPPED stash@{${drop.variables ?? 0}}`
                : null
        }
      />
    </LocalPanel>
  );
}
