export type StatTileTone = "ok" | "warn" | "err" | "info";

export interface StatTileDelta {
  label: string;
  tone?: StatTileTone;
}

export interface StatTileProps {
  value: string;
  label: string;
  hint?: string;
  delta?: StatTileDelta;
  className?: string;
}

export function StatTile({ value, label, hint, delta, className }: StatTileProps) {
  return (
    <div className={["stattile", className].filter(Boolean).join(" ")}>
      <span className="t-label stattile__label">{label}</span>
      <span className="t-display-md stattile__value">{value}</span>
      {delta ? (
        <span className="t-label stattile__delta" data-tone={delta.tone ?? "neutral"}>
          {delta.label}
        </span>
      ) : null}
      {hint ? <span className="t-caption stattile__hint">{hint}</span> : null}
    </div>
  );
}
