export interface ProgressBarProps {
  value?: number | null;
  max?: number;
  label: string;
}

export function ProgressBar({ value = null, max = 100, label }: ProgressBarProps) {
  const indeterminate = value === null;
  const ratio = indeterminate ? 0 : Math.min(1, Math.max(0, value / max));

  return (
    <div
      className={["progress", indeterminate ? "progress--indeterminate" : ""]
        .filter(Boolean)
        .join(" ")}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={indeterminate ? undefined : value}
    >
      <div
        className="progress__bar"
        style={indeterminate ? undefined : { transform: `scaleX(${ratio})` }}
      />
    </div>
  );
}
