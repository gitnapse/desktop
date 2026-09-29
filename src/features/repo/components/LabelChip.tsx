import { X } from "lucide-react";
import { iconSize, iconStroke } from "../../../ui";
import type { LabelDto } from "../../../lib/types";

export interface LabelChipProps {
  label: LabelDto;
  onRemove?: () => void;
  className?: string;
}

export function LabelChip({ label, onRemove, className }: LabelChipProps) {
  const color =
    label.color && /^[0-9a-f]{3,8}$/i.test(label.color) ? `#${label.color}` : null;
  return (
    <span className={["labelchip", className].filter(Boolean).join(" ")}>
      {color ? (
        <span className="labelchip__swatch" style={{ background: color }} aria-hidden="true" />
      ) : null}
      <span className="labelchip__name">{label.name}</span>
      {onRemove ? (
        <button
          type="button"
          className="labelchip__remove"
          onClick={onRemove}
          aria-label={`Remove label ${label.name}`}
        >
          <X size={iconSize.sm} strokeWidth={iconStroke} aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}
