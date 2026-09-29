import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { IconButton } from "../ui";
import * as bridge from "../lib/bridge";
import {
  NOTIFICATIONS_PAGE_SIZE,
  notificationsQueryKey,
  unreadCount,
} from "../features/notifications/lib/notifications";
import { authQueryKey } from "./auth";

export function NotificationsBell() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useQuery({ queryKey: authQueryKey, queryFn: bridge.authStatus });
  const notifications = useQuery({
    queryKey: notificationsQueryKey,
    queryFn: () => bridge.notifications(1, NOTIFICATIONS_PAGE_SIZE),
    enabled: Boolean(auth.data?.has_token),
    retry: false,
  });

  const unread = unreadCount(notifications.data);
  const active = location.pathname.startsWith("/notifications");

  return (
    <span className="topbar__bell">
      <IconButton
        icon={Bell}
        label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-current={active ? "page" : undefined}
        onClick={() => navigate("/notifications")}
      />
      {unread > 0 ? (
        <span className="topbar__bell-badge t-label" aria-hidden="true">
          {unread > 99 ? "99+" : String(unread)}
        </span>
      ) : null}
    </span>
  );
}
