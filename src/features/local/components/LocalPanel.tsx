import type { ReactNode } from "react";
import { StatusLine } from "../../../ui";

export interface LocalPanelProps {
  title: string;
  label?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function LocalPanel({ title, label, actions, children, className }: LocalPanelProps) {
  return (
    <section className={["lpanel", "glass-flat", className].filter(Boolean).join(" ")}>
      <header className="lpanel__head">
        <div className="lpanel__titles">
          {label ? <p className="t-label lpanel__label">{label}</p> : null}
          <h2 className="lpanel__title">{title}</h2>
        </div>
        {actions ? <div className="lpanel__actions">{actions}</div> : null}
      </header>
      <div className="lpanel__body">{children}</div>
    </section>
  );
}

export interface FeedbackProps {
  pending?: boolean;
  error?: Error | null;
  saved?: string | null;
}

export function Feedback({ pending = false, error = null, saved = null }: FeedbackProps) {
  if (pending) {
    return <StatusLine kind="loading" />;
  }
  if (error) {
    return <StatusLine kind="error" message={error.message} />;
  }
  if (saved) {
    return <StatusLine kind="saved" message={saved} />;
  }
  return null;
}
