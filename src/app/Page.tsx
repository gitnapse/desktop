import type { ReactNode } from "react";

export interface PageProps {
  title: string;
  label: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function Page({ title, label, actions, children, className }: PageProps) {
  return (
    <section className={["page", className].filter(Boolean).join(" ")}>
      <header className="page__head">
        <div className="page__titles">
          <h1 className="t-heading page__title">{title}</h1>
          <p className="t-label page__label">{label}</p>
        </div>
        {actions ? <div className="page__actions">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
