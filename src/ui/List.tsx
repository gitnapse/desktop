import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export interface ListProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

export function List({ children, label, className }: ListProps) {
  return (
    <ul className={["list", className].filter(Boolean).join(" ")} aria-label={label}>
      {children}
    </ul>
  );
}

export interface ListItemProps {
  primary: ReactNode;
  secondary?: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  to?: string;
  onClick?: () => void;
  selected?: boolean;
}

export function ListItem({
  primary,
  secondary,
  meta,
  trailing,
  to,
  onClick,
  selected = false,
}: ListItemProps) {
  const classes = [
    "list__item",
    to ?? onClick ? "list__item--action" : "",
    selected ? "list__item--selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <span className="list__item__main">
        <span className="list__item__primary">{primary}</span>
        {secondary ? <span className="list__item__secondary">{secondary}</span> : null}
      </span>
      {meta ? <span className="list__item__meta">{meta}</span> : null}
      {trailing}
    </>
  );

  if (to) {
    return (
      <li>
        <Link to={to} className={classes}>
          {content}
        </Link>
      </li>
    );
  }

  if (onClick) {
    return (
      <li>
        <button type="button" className={classes} onClick={onClick}>
          {content}
        </button>
      </li>
    );
  }

  return <li className={classes}>{content}</li>;
}
