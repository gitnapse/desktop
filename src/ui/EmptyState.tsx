import type { ReactNode } from "react";

export interface EmptyStateProps {
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, hint, action, className }: EmptyStateProps) {
  return (
    <div className={["empty", className].filter(Boolean).join(" ")}>
      <p className="t-label empty__title">{`[${title}]`}</p>
      {hint ? <p className="empty__hint">{hint}</p> : null}
      {action ? <div className="empty__action">{action}</div> : null}
    </div>
  );
}
