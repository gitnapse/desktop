import type { ReactNode } from "react";

export interface SectionPanelProps {
  title: string;
  label?: string;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  className?: string;
}

export function SectionPanel({
  title,
  label,
  actions,
  children,
  flush = false,
  className,
}: SectionPanelProps) {
  return (
    <section
      className={["rpanel", "glass-flat", flush ? "rpanel--flush" : "", className ?? ""]
        .filter(Boolean)
        .join(" ")}
    >
      <header className="rpanel__head">
        <div className="rpanel__titles">
          {label ? <p className="t-label rpanel__label">{label}</p> : null}
          <h2 className="rpanel__title">{title}</h2>
        </div>
        {actions ? <div className="rpanel__actions">{actions}</div> : null}
      </header>
      <div className="rpanel__body">{children}</div>
    </section>
  );
}
