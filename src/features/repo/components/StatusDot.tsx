import type { StatusTone } from "../lib/tones";

export interface StatusDotProps {
  tone?: StatusTone;
  label: string;
  className?: string;
}

export function StatusDot({ tone = "muted", label, className }: StatusDotProps) {
  return (
    <span className={["statusdot", className].filter(Boolean).join(" ")} data-tone={tone}>
      <span className="statusdot__dot" aria-hidden="true" />
      <span className="statusdot__label">{label}</span>
    </span>
  );
}
