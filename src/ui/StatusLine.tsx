export type StatusKind = "idle" | "loading" | "saved" | "error" | "warn" | "info";

export interface StatusLineProps {
  kind?: StatusKind;
  message?: string;
  className?: string;
}

const labels: Record<StatusKind, string> = {
  idle: "READY",
  loading: "LOADING…",
  saved: "SAVED",
  error: "ERROR",
  warn: "WARN",
  info: "INFO",
};

const tones: Record<StatusKind, string> = {
  idle: "muted",
  loading: "muted",
  saved: "ok",
  error: "err",
  warn: "warn",
  info: "info",
};

export function StatusLine({ kind = "idle", message, className }: StatusLineProps) {
  const text = message ? `[${labels[kind]}: ${message}]` : `[${labels[kind]}]`;
  return (
    <p
      className={["statusline", className].filter(Boolean).join(" ")}
      data-kind={tones[kind]}
      role="status"
      aria-live="polite"
    >
      {text}
    </p>
  );
}
