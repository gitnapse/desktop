import type { ReactNode } from "react";

export interface EmptyPanelProps {
  title: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyPanel({ title, hint, action, className }: EmptyPanelProps) {
  return (
    <div className={["emptypanel", "glass-flat", className].filter(Boolean).join(" ")}>
      <p className="t-label emptypanel__title">{`[${title}]`}</p>
      {hint ? <p className="emptypanel__hint">{hint}</p> : null}
      {action ? <div className="emptypanel__action">{action}</div> : null}
    </div>
  );
}
