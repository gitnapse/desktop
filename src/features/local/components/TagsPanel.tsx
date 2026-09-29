import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tag, Trash2 } from "lucide-react";
import { Button, IconButton, Input, RelativeTime } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import { QueryFeedback } from "../../repo/components/QueryFeedback";
import { localKeys } from "../lib/keys";
import { Feedback, LocalPanel } from "./LocalPanel";

export interface TagsPanelProps {
  cwd: string;
}

export function TagsPanel({ cwd }: TagsPanelProps) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const tags = useQuery({
    queryKey: localKeys.tags(cwd),
    queryFn: () => bridge.gitTags(cwd),
  });

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: localKeys.tags(cwd) });
  };

  const create = useMutation({
    mutationFn: () => bridge.gitTagCreate(cwd, name.trim(), message.trim() || undefined),
    onSuccess: () => {
      setName("");
      setMessage("");
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (tagName: string) => bridge.gitTagDelete(cwd, tagName),
    onSuccess: refresh,
  });

  return (
    <LocalPanel title="Tags" label="Releases">
      <QueryFeedback
        pending={tags.isPending}
        error={tags.error}
        onRetry={() => void tags.refetch()}
      />
      {tags.isSuccess && tags.data.length === 0 ? <p className="t-label">[NO TAGS]</p> : null}
      {tags.isSuccess && tags.data.length > 0 ? (
        <ul className="rows">
          {tags.data.map((tag) => (
            <li className="datarow" key={tag.name}>
              <div className="datarow__grow">
                <Tag size={16} strokeWidth={1.5} aria-hidden="true" />
                <span className="datarow__main">
                  <code className="datarow__branch">{tag.name}</code>
                  <span className="datarow__meta">
                    {tag.message ? <span>{tag.message}</span> : null}
                    {tag.date ? <RelativeTime value={tag.date} /> : null}
                  </span>
                </span>
              </div>
              <span className="datarow__trailing">
                <IconButton
                  icon={Trash2}
                  size="sm"
                  label={`Delete tag ${tag.name}`}
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(tag.name)}
                />
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="settings-stack">
        <div className="syncrow">
          <Input
            label="New tag"
            mono
            spellCheck={false}
            placeholder="v0.2.0"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Input
            label="Message"
            spellCheck={false}
            placeholder="Optional"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>
        <div className="auth-actions">
          <Button
            variant="technical"
            icon={Plus}
            disabled={name.trim().length === 0 || create.isPending}
            onClick={() => create.mutate()}
          >
            Create tag
          </Button>
        </div>
      </div>
      <Feedback
        pending={create.isPending || remove.isPending}
        error={create.error ?? remove.error}
        saved={
          create.isSuccess && !create.isPending
            ? `TAG ${create.variables ?? ""} CREATED`
            : remove.isSuccess && !remove.isPending
              ? `TAG ${remove.variables ?? ""} DELETED`
              : null
        }
      />
    </LocalPanel>
  );
}
