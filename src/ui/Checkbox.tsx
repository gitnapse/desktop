import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Check } from "lucide-react";
import { iconSize, iconStroke } from "./icon";

export interface CheckboxProps extends Omit<ComponentPropsWithoutRef<"input">, "type"> {
  label: ReactNode;
  description?: string;
}

export function Checkbox({ label, description, className, ...rest }: CheckboxProps) {
  return (
    <label className={["checkbox", className].filter(Boolean).join(" ")}>
      <input type="checkbox" className="checkbox__input" {...rest} />
      <span className="checkbox__box" aria-hidden="true">
        <Check size={iconSize.sm} strokeWidth={iconStroke} />
      </span>
      <span className="checkbox__label t-body-sm">
        {label}
        {description ? <span className="field__hint"> — {description}</span> : null}
      </span>
    </label>
  );
}
