import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Bell,
  Check,
  CheckCircle2,
  CircleDot,
  ExternalLink,
  GitCommitHorizontal,
  GitPullRequest,
  MessageSquare,
  RefreshCw,
  ShieldAlert,
  Tag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Page } from "../Page";
import { Badge, Button, EmptyState, IconButton, RelativeTime, StatusLine, Tabs } from "../../ui";
import * as bridge from "../../lib/bridge";
import type { NotificationDto } from "../../lib/types";
import {
  NOTIFICATIONS_PAGE_SIZE,
  filterNotifications,
  notificationFilters,
  notificationReasonLabel,
  notificationReasonTone,
  notificationSubjectLabel,
  notificationsQueryKey,
  parseNotificationFilter,
  unreadCount,
} from "../../features/notifications/lib/notifications";
import "../../features/notifications/notifications.css";

const subjectIcons: Record<string, LucideIcon> = {
  CheckSuite: CheckCircle2,
  Commit: GitCommitHorizontal,
  Discussion: MessageSquare,
  Issue: CircleDot,
  PullRequest: GitPullRequest,
  Release: Tag,
  RepositoryVulnerabilityAlert: ShieldAlert,
};

export default function NotificationsPage() {
  const [params, setParams] = useSearchParams();
  const filter = parseNotificationFilter(params.get("filter"));
  const queryClient = useQueryClient();

  const notifications = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: () => bridge.notifications(1, NOTIFICATIONS_PAGE_SIZE),
  });

  const items = notifications.data ?? [];
  const visible = useMemo(() => filterNotifications(items, filter), [items, filter]);
  const unread = unreadCount(items);

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
  };

  const markRead = useMutation({
    mutationFn: (id: string) => bridge.notificationMarkRead(id),
    onSuccess: invalidate,
  });

  const markAll = useMutation({
    mutationFn: async () => {
      const pending = items.filter((item) => item.unread);
      for (const item of pending) {
        await bridge.notificationMarkRead(item.id);
      }
      return pending.length;
    },
    onSuccess: invalidate,
  });

  function setFilter(next: string) {
    const params = new URLSearchParams();
    if (next === "unread") {
      params.set("filter", "unread");
    }
    setParams(params);
  }

  return (
    <Page title="Notifications" label="GitNapse // Inbox">
      <header className="notifications__head">
        <div className="notifications__summary">
          <p className="t-label">{`${unread} UNREAD · ${items.length} TOTAL`}</p>
        </div>
        <Button
          variant="technical"
          icon={Check}
          disabled={unread === 0 || markAll.isPending}
          onClick={() => markAll.mutate()}
        >
          Mark all read
        </Button>
      </header>

      <Tabs
        ariaLabel="Notification filter"
        value={filter}
        items={notificationFilters}
        onChange={setFilter}
      />

      {notifications.isPending ? <StatusLine kind="loading" /> : null}
      {notifications.isError ? (
        <div className="settings-row">
          <StatusLine kind="error" message={notifications.error.message} />
          <Button
            variant="technical"
            icon={RefreshCw}
            onClick={() => void notifications.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : null}
      {markAll.isSuccess ? (
        <StatusLine kind="saved" message={`${markAll.data} marked read`} />
      ) : null}
      {markAll.isError ? <StatusLine kind="error" message={markAll.error.message} /> : null}
      {markRead.isError ? <StatusLine kind="error" message={markRead.error.message} /> : null}

      {notifications.isSuccess && items.length === 0 ? (
        <EmptyState
          title="INBOX ZERO"
          hint="No notifications. GitHub will surface review requests, mentions and CI here."
        />
      ) : null}

      {notifications.isSuccess && items.length > 0 && visible.length === 0 ? (
        <EmptyState title="NOTHING UNREAD" hint="Every notification has been read." />
      ) : null}

      {visible.length > 0 ? (
        <ul className="nrows">
          {visible.map((item) => (
            <NotificationRow
              key={item.id}
              item={item}
              onMarkRead={() => markRead.mutate(item.id)}
              readPending={markRead.isPending && markRead.variables === item.id}
            />
          ))}
        </ul>
      ) : null}
    </Page>
  );
}

function NotificationRow({
  item,
  onMarkRead,
  readPending,
}: {
  item: NotificationDto;
  onMarkRead: () => void;
  readPending: boolean;
}) {
  const Icon: LucideIcon = subjectIcons[item.subject_type] ?? Bell;
  const tone = notificationReasonTone(item.reason);

  const main = (
    <>
      <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
      <span className="nrow__main">
        <span className="nrow__title">{item.subject_title || "(untitled)"}</span>
        <span className="nrow__meta">
          {item.repo ? <span className="t-label">{item.repo}</span> : null}
          <span className="t-label">{notificationSubjectLabel(item.subject_type)}</span>
          <Badge tone={tone}>{notificationReasonLabel(item.reason)}</Badge>
          <RelativeTime value={item.updated_at} />
        </span>
      </span>
    </>
  );

  return (
    <li className="nrow" data-unread={item.unread ? "true" : undefined}>
      <span className="nrow__dot" aria-hidden="true" data-visible={item.unread ? "true" : "false"} />
      {item.html_url ? (
        <a
          className="nrow__grow"
          href={item.html_url}
          onClick={(event) => {
            event.preventDefault();
            void bridge.openExternal(item.html_url ?? "");
          }}
        >
          {main}
        </a>
      ) : (
        <div className="nrow__grow">{main}</div>
      )}
      <span className="nrow__trailing">
        {item.unread ? (
          <IconButton
            icon={Check}
            size="sm"
            label="Mark as read"
            disabled={readPending}
            onClick={onMarkRead}
          />
        ) : null}
        {item.html_url ? (
          <IconButton
            icon={ExternalLink}
            size="sm"
            label="Open on GitHub"
            onClick={() => {
              void bridge.openExternal(item.html_url ?? "");
            }}
          />
        ) : null}
      </span>
    </li>
  );
}
