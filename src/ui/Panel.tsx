import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import type { GlassLevel } from "../lib/theme";

export type PanelLevel = GlassLevel | "app";

type PanelOwnProps<E extends ElementType> = {
  as?: E;
  level?: PanelLevel;
  title?: string;
  label?: string;
  actions?: ReactNode;
  padded?: boolean;
  children?: ReactNode;
};

export type PanelProps<E extends ElementType = "section"> = PanelOwnProps<E> &
  Omit<ComponentPropsWithoutRef<E>, keyof PanelOwnProps<E>>;

export function Panel<E extends ElementType = "section">({
  as,
  level = "app",
  title,
  label,
  actions,
  padded = true,
  className,
  children,
  ...rest
}: PanelProps<E>) {
  const Component = (as ?? "section") as ElementType;
  const classes = [
    "panel",
    level === "app" ? "glass" : `glass glass--${level}`,
    padded ? "" : "panel--flush",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const hasHead = Boolean(title || label || actions);

  return (
    <Component className={classes} {...rest}>
      {hasHead ? (
        <header className="panel__head">
          <div className="panel__titles">
            {label ? <p className="t-label panel__label">{label}</p> : null}
            {title ? <h2 className="panel__title">{title}</h2> : null}
          </div>
          {actions ? <div className="panel__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="panel__body">{children}</div>
    </Component>
  );
}
