import { formatAbsoluteTime, formatRelativeTime, type TimeInput } from "../lib/format";

export interface RelativeTimeProps {
  value: TimeInput;
  className?: string;
}

export function RelativeTime({ value, className }: RelativeTimeProps) {
  const absolute = formatAbsoluteTime(value);
  const classes = ["t-data", "reltime", className].filter(Boolean).join(" ");
  if (!absolute) {
    return <time className={classes}>—</time>;
  }
  return (
    <time className={classes} dateTime={absolute.iso} title={absolute.label}>
      {formatRelativeTime(value)}
    </time>
  );
}
