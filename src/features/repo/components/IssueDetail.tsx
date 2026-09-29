import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, MessageSquare, X } from "lucide-react";
import { Avatar, Button, Markdown, RelativeTime, StatusLine, Textarea } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import { issueTone } from "../lib/tones";
import { LabelChip } from "./LabelChip";
import { QueryFeedback } from "./QueryFeedback";
import { StatusDot } from "./StatusDot";

export interface IssueDetailProps {
  repo: string;
  number: number;
  onClose: () => void;
}

export function IssueDetail({ repo, number, onClose }: IssueDetailProps) {
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();

  const issue = useQuery({
    queryKey: ["issue", repo, number],
    queryFn: () => bridge.issue(repo, number),
  });
  const comments = useQuery({
    queryKey: ["issue-comments", repo, number],
    queryFn: () => bridge.issueComments(repo, number),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["issue", repo, number] });
    void queryClient.invalidateQueries({ queryKey: ["issues", repo] });
  };

  const post = useMutation({
    mutationFn: () => bridge.commentIssue(repo, number, comment.trim()),
    onSuccess: () => {
      setComment("");
      void queryClient.invalidateQueries({ queryKey: ["issue-comments", repo, number] });
      invalidate();
    },
  });

  const setState = useMutation({
    mutationFn: (next: "open" | "closed") =>
      next === "closed" ? bridge.closeIssue(repo, number) : bridge.reopenIssue(repo, number),
    onSuccess: invalidate,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (comment.trim().length > 0 && !post.isPending) {
      post.mutate();
    }
  }

  return (
    <section className="detail glass-flat">
      <header className="detail__head">
        <div className="detail__titles">
          <p className="t-label detail__number">{`Issue #${number}`}</p>
          {issue.isSuccess ? <h2 className="detail__title">{issue.data.title}</h2> : null}
        </div>
        <div className="detail__actions">
          {issue.isSuccess ? (
            <Button
              variant="technical"
              icon={ExternalLink}
              onClick={() => {
                void bridge.openExternal(issue.data.html_url);
              }}
            >
              GitHub
            </Button>
          ) : null}
          {issue.isSuccess ? (
            <Button
              variant="technical"
              onClick={() => setState.mutate(issue.data.state === "open" ? "closed" : "open")}
              disabled={setState.isPending}
            >
              {issue.data.state === "open" ? "Close" : "Reopen"}
            </Button>
          ) : null}
          <Button variant="technical" icon={X} onClick={onClose}>
            Back
          </Button>
        </div>
      </header>

      <QueryFeedback
        pending={issue.isPending}
        error={issue.error}
        onRetry={() => void issue.refetch()}
      />

      {issue.isSuccess ? (
        <>
          <div className="detail__meta">
            <StatusDot tone={issueTone(issue.data.state)} label={issue.data.state} />
            <span className="t-caption">
              <span className="datarow__author">{`@${issue.data.user.login}`}</span>
              {` opened `}
              <RelativeTime value={issue.data.created_at} />
            </span>
          </div>
          {issue.data.labels.length > 0 ? (
            <div className="detail__labels">
              {issue.data.labels.map((label) => (
                <LabelChip key={label.name} label={label} />
              ))}
            </div>
          ) : null}
          <div className="detail__body">
            {issue.data.body ? (
              <Markdown source={issue.data.body} />
            ) : (
              <p className="t-label">[NO DESCRIPTION]</p>
            )}
          </div>
        </>
      ) : null}

      <section className="thread" aria-label="Comments">
        <p className="t-label thread__label">
          <MessageSquare size={14} strokeWidth={1.5} aria-hidden="true" />
          {` Thread`}
        </p>
        <QueryFeedback
          pending={comments.isPending}
          error={comments.error}
          onRetry={() => void comments.refetch()}
        />
        {comments.isSuccess && comments.data.length === 0 ? (
          <p className="t-label">[NO COMMENTS]</p>
        ) : null}
        {comments.isSuccess && comments.data.length > 0 ? (
          <ul className="thread__list">
            {comments.data.map((entry) => (
              <li className="thread__item" key={entry.id}>
                <Avatar login={entry.user.login} src={entry.user.avatar_url} size="sm" />
                <div className="thread__main">
                  <div className="thread__head">
                    <span className="t-data thread__login">{`@${entry.user.login}`}</span>
                    <RelativeTime value={entry.created_at} />
                  </div>
                  <Markdown source={entry.body} className="thread__body" />
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <form className="composer" onSubmit={submit}>
        <Textarea
          label="Comment"
          rows={4}
          value={comment}
          placeholder="Leave a comment"
          onChange={(event) => setComment(event.target.value)}
        />
        <div className="composer__actions">
          <Button
            type="submit"
            primary
            disabled={comment.trim().length === 0 || post.isPending}
          >
            Comment
          </Button>
          {post.isPending ? <StatusLine kind="loading" /> : null}
          {post.isError ? <StatusLine kind="error" message={post.error.message} /> : null}
          {post.isSuccess ? <StatusLine kind="saved" message="COMMENT POSTED" /> : null}
          {setState.isError ? <StatusLine kind="error" message={setState.error.message} /> : null}
          {setState.isSuccess ? (
            <StatusLine kind="saved" message={`ISSUE ${setState.data.state.toUpperCase()}`} />
          ) : null}
        </div>
      </form>
    </section>
  );
}
