import type { ReactNode } from "react";

export interface TooltipProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function Tooltip({ label, children, className }: TooltipProps) {
  return (
    <span className={["tooltip", className].filter(Boolean).join(" ")} data-tooltip={label}>
      {children}
    </span>
  );
}
