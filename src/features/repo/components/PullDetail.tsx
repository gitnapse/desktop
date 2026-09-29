import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, GitMerge, X } from "lucide-react";
import {
  Avatar,
  Button,
  Markdown,
  RelativeTime,
  Select,
  StatusLine,
  Tabs,
  Textarea,
} from "../../../ui";
import * as bridge from "../../../lib/bridge";
import type { ActorDto } from "../../../lib/types";
import { pullLabel, pullTone, reviewTone, statusLabel } from "../lib/tones";
import type { PullView } from "../lib/query";
import { commitToRow } from "../lib/commit";
import { CommitRow } from "./CommitRow";
import { DiffView } from "./DiffView";
import { QueryFeedback } from "./QueryFeedback";
import { StatusDot } from "./StatusDot";

export interface PullDetailProps {
  repo: string;
  number: number;
  view: PullView;
  onViewChange: (view: PullView) => void;
  onClose: () => void;
  onMerge: () => void;
}

interface TimelineEntry {
  key: string;
  kind: "review" | "comment";
  user: ActorDto;
  date: string;
  body: string | null;
  state: string | null;
  path: string | null;
  position: number | null;
}

const reviewEvents = [
  { value: "comment", label: "Comment" },
  { value: "approve", label: "Approve" },
  { value: "request_changes", label: "Request changes" },
];

export function PullDetail({
  repo,
  number,
  view,
  onViewChange,
  onClose,
  onMerge,
}: PullDetailProps) {
  const [comment, setComment] = useState("");
  const [reviewEvent, setReviewEvent] = useState("comment");
  const [reviewBody, setReviewBody] = useState("");
  const queryClient = useQueryClient();

  const pull = useQuery({
    queryKey: ["pull", repo, number],
    queryFn: () => bridge.pullRequest(repo, number),
  });
  const conversation = useQuery({
    queryKey: ["pr-conversation", repo, number],
    queryFn: () => bridge.prConversation(repo, number),
    enabled: view === "conversation",
  });
  const inlineComments = useQuery({
    queryKey: ["pr-comments", repo, number],
    queryFn: () => bridge.pullRequestComments(repo, number),
    enabled: view === "conversation",
  });
  const files = useQuery({
    queryKey: ["pr-files", repo, number],
    queryFn: () => bridge.prFiles(repo, number),
    enabled: view === "files",
  });
  const commits = useQuery({
    queryKey: ["pr-commits", repo, number],
    queryFn: () => bridge.pullRequestCommits(repo, number),
    enabled: view === "commits",
  });
  const reviews = useQuery({
    queryKey: ["pr-reviews", repo, number],
    queryFn: () => bridge.pullRequestReviews(repo, number),
    enabled: view === "reviews" || view === "conversation",
  });

  const invalidateConversation = () => {
    void queryClient.invalidateQueries({ queryKey: ["pr-conversation", repo, number] });
    void queryClient.invalidateQueries({ queryKey: ["pull", repo, number] });
  };

  // Conversation comments live on the issue endpoint (`pr_conversation` reads
  // the same feed), so a posted comment refreshes the thread.
  const postComment = useMutation({
    mutationFn: () => bridge.commentIssue(repo, number, comment.trim()),
    onSuccess: () => {
      setComment("");
      invalidateConversation();
    },
  });

  const submitReview = useMutation({
    mutationFn: () => bridge.reviewPullRequest(repo, number, reviewEvent, reviewBody.trim() || undefined),
    onSuccess: () => {
      setReviewBody("");
      void queryClient.invalidateQueries({ queryKey: ["pr-reviews", repo, number] });
      invalidateConversation();
    },
  });

  const setState = useMutation({
    mutationFn: (next: string) => bridge.updatePullRequest(repo, number, next),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pull", repo, number] });
      void queryClient.invalidateQueries({ queryKey: ["pulls", repo] });
    },
  });

  const timeline = useMemo<TimelineEntry[]>(() => {
    const entries: TimelineEntry[] = [];
    for (const review of reviews.data ?? []) {
      entries.push({
        key: `review-${review.id}`,
        kind: "review",
        user: review.user,
        date: review.submitted_at ?? "",
        body: review.body,
        state: review.state,
        path: null,
        position: null,
      });
    }
    for (const entry of inlineComments.data ?? []) {
      entries.push({
        key: `comment-${entry.id}`,
        kind: "comment",
        user: entry.user,
        date: entry.created_at,
        body: entry.body,
        state: null,
        path: entry.path,
        position: entry.position,
      });
    }
    for (const entry of conversation.data ?? []) {
      entries.push({
        key: `issue-comment-${entry.id}`,
        kind: "comment",
        user: entry.user,
        date: entry.created_at,
        body: entry.body,
        state: null,
        path: null,
        position: null,
      });
    }
    return entries.sort((a, b) => (Date.parse(a.date) || 0) - (Date.parse(b.date) || 0));
  }, [conversation.data, inlineComments.data, reviews.data]);

  function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (comment.trim().length > 0 && !postComment.isPending) {
      postComment.mutate();
    }
  }

  function submitReviewForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!submitReview.isPending) {
      submitReview.mutate();
    }
  }

  const open = pull.isSuccess && pull.data.state === "open" && pull.data.merged !== true;

  return (
    <section className="detail glass-flat">
      <header className="detail__head">
        <div className="detail__titles">
          <p className="t-label detail__number">{`Pull request #${number}`}</p>
          {pull.isSuccess ? <h2 className="detail__title">{pull.data.title}</h2> : null}
        </div>
        <div className="detail__actions">
          {pull.isSuccess ? (
            <>
              <Button
                variant="technical"
                icon={ExternalLink}
                onClick={() => {
                  void bridge.openExternal(pull.data.html_url);
                }}
              >
                GitHub
              </Button>
              <Button
                variant="technical"
                primary={open}
                icon={GitMerge}
                disabled={!open}
                onClick={onMerge}
              >
                Merge
              </Button>
              <Button
                variant="technical"
                onClick={() => setState.mutate(pull.data.state === "open" ? "closed" : "open")}
                disabled={setState.isPending || pull.data.merged === true}
              >
                {pull.data.state === "open" ? "Close" : "Reopen"}
              </Button>
            </>
          ) : null}
          <Button variant="technical" icon={X} onClick={onClose}>
            Back
          </Button>
        </div>
      </header>

      <QueryFeedback
        pending={pull.isPending}
        error={pull.error}
        onRetry={() => void pull.refetch()}
      />

      {pull.isSuccess ? (
        <div className="detail__meta">
          <StatusDot tone={pullTone(pull.data)} label={pullLabel(pull.data)} />
          <span className="t-caption">
            <span className="datarow__author">{`@${pull.data.user.login}`}</span>
            {` wants to merge `}
            <code>{pull.data.head.ref}</code>
            {` into `}
            <code>{pull.data.base.ref}</code>
          </span>
          <span className="t-label">
            {`+${pull.data.additions ?? 0} -${pull.data.deletions ?? 0} · ${
              pull.data.changed_files ?? 0
            } FILES`}
          </span>
        </div>
      ) : null}

      <Tabs
        ariaLabel="Pull request sections"
        value={view}
        items={[
          { value: "conversation", label: "Conversation" },
          { value: "files", label: "Files changed" },
          { value: "commits", label: "Commits" },
          { value: "reviews", label: "Reviews" },
        ]}
        onChange={(value) => onViewChange(value as PullView)}
      />

      {view === "conversation" ? (
        <section className="thread" aria-label="Conversation">
          <QueryFeedback
            pending={conversation.isPending}
            error={conversation.error}
            onRetry={() => void conversation.refetch()}
          />
          {conversation.isSuccess && timeline.length === 0 ? (
            <p className="t-label">[NO CONVERSATION]</p>
          ) : null}
          {timeline.length > 0 ? (
            <ul className="thread__list">
              {timeline.map((entry) => (
                <li className="thread__item" key={entry.key}>
                  <Avatar login={entry.user.login} src={entry.user.avatar_url} size="sm" />
                  <div className="thread__main">
                    <div className="thread__head">
                      <span className="t-data thread__login">{`@${entry.user.login}`}</span>
                      {entry.kind === "review" && entry.state ? (
                        <StatusDot
                          tone={reviewTone(entry.state)}
                          label={statusLabel(entry.state)}
                        />
                      ) : null}
                      {entry.kind === "comment" ? <span className="t-label">commented</span> : null}
                      <RelativeTime value={entry.date} />
                    </div>
                    {entry.path ? (
                      <p className="t-label thread__path">
                        {`${entry.path}${entry.position !== null ? `:${entry.position}` : ""}`}
                      </p>
                    ) : null}
                    {entry.body ? <Markdown source={entry.body} className="thread__body" /> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <form className="composer" onSubmit={submitComment}>
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
                disabled={comment.trim().length === 0 || postComment.isPending}
              >
                Comment
              </Button>
              {postComment.isPending ? <StatusLine kind="loading" /> : null}
              {postComment.isError ? (
                <StatusLine kind="error" message={postComment.error.message} />
              ) : null}
              {postComment.isSuccess ? <StatusLine kind="saved" message="COMMENT POSTED" /> : null}
            </div>
          </form>
        </section>
      ) : null}

      {view === "files" ? (
        <>
          <QueryFeedback
            pending={files.isPending}
            error={files.error}
            onRetry={() => void files.refetch()}
          />
          {files.isSuccess ? <DiffView files={files.data} emptyLabel="NO FILES" /> : null}
        </>
      ) : null}

      {view === "commits" ? (
        <>
          <QueryFeedback
            pending={commits.isPending}
            error={commits.error}
            onRetry={() => void commits.refetch()}
          />
          {commits.isSuccess && commits.data.length === 0 ? (
            <p className="t-label">[NO COMMITS]</p>
          ) : null}
          {commits.isSuccess && commits.data.length > 0 ? (
            <ul className="rows">
              {commits.data.map((commit) => (
                <CommitRow
                  key={commit.sha}
                  commit={commitToRow(commit)}
                  avatar
                  repoFullName={repo}
                />
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      {view === "reviews" ? (
        <>
          <QueryFeedback
            pending={reviews.isPending}
            error={reviews.error}
            onRetry={() => void reviews.refetch()}
          />
          {reviews.isSuccess && reviews.data.length === 0 ? (
            <p className="t-label">[NO REVIEWS]</p>
          ) : null}
          {reviews.isSuccess && reviews.data.length > 0 ? (
            <ul className="thread__list">
              {reviews.data.map((review) => (
                <li className="thread__item" key={review.id}>
                  <Avatar login={review.user.login} src={review.user.avatar_url} size="sm" />
                  <div className="thread__main">
                    <div className="thread__head">
                      <span className="t-data thread__login">{`@${review.user.login}`}</span>
                      <StatusDot tone={reviewTone(review.state)} label={statusLabel(review.state)} />
                      {review.submitted_at ? <RelativeTime value={review.submitted_at} /> : null}
                    </div>
                    {review.body ? <Markdown source={review.body} className="thread__body" /> : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          <form className="composer" onSubmit={submitReviewForm}>
            <Select
              label="Review action"
              options={reviewEvents}
              value={reviewEvent}
              onChange={(event) => setReviewEvent(event.target.value)}
            />
            <Textarea
              label="Review notes"
              rows={4}
              value={reviewBody}
              placeholder="Optional summary"
              onChange={(event) => setReviewBody(event.target.value)}
            />
            <div className="composer__actions">
              <Button type="submit" primary disabled={submitReview.isPending}>
                Submit review
              </Button>
              {submitReview.isPending ? <StatusLine kind="loading" /> : null}
              {submitReview.isError ? (
                <StatusLine kind="error" message={submitReview.error.message} />
              ) : null}
              {submitReview.isSuccess ? (
                <StatusLine kind="saved" message="REVIEW SUBMITTED" />
              ) : null}
              {setState.isError ? <StatusLine kind="error" message={setState.error.message} /> : null}
              {setState.isSuccess ? (
                <StatusLine kind="saved" message={`PULL ${pull.data?.state.toUpperCase() ?? "UPDATED"}`} />
              ) : null}
            </div>
          </form>
        </>
      ) : null}
    </section>
  );
}
