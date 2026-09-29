import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "ok" | "warn" | "err" | "info";

export interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}

export function Badge({ tone = "neutral", className, children }: BadgeProps) {
  return (
    <span className={["badge", className].filter(Boolean).join(" ")} data-tone={tone}>
      {children}
    </span>
  );
}
