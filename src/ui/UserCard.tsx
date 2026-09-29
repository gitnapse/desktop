import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Avatar } from "./Avatar";

/** Widened so both `UserDto` (`{login}`) and `UserProfileDto` fit. */
export interface UserCardUser {
  login: string;
  name?: string | null;
  avatar_url?: string | null;
}

export interface UserCardProps {
  user: UserCardUser;
  to?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  material?: "flat" | "glass";
  className?: string;
}

export function UserCard({
  user,
  to,
  meta,
  actions,
  material = "flat",
  className,
}: UserCardProps) {
  const classes = [
    "card",
    "card--interactive",
    "usercard",
    material === "glass" ? "glass glass--regular" : "glass-flat",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={classes}>
      <Avatar login={user.login} src={user.avatar_url} labelled />
      <div className="usercard__main">
        <Link className="usercard__login" to={to ?? `/users/${user.login}`}>
          {user.login}
        </Link>
        {user.name ? <span className="usercard__name">{user.name}</span> : null}
        {meta ? <span className="usercard__meta">{meta}</span> : null}
      </div>
      {actions ? <span className="usercard__actions">{actions}</span> : null}
    </article>
  );
}
