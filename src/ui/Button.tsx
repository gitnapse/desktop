import type { ComponentPropsWithoutRef } from "react";
import type { LucideIcon } from "lucide-react";
import { iconSize, iconStroke } from "./icon";

export type ButtonVariant = "pill" | "technical";

export interface ButtonProps extends ComponentPropsWithoutRef<"button"> {
  variant?: ButtonVariant;
  primary?: boolean;
  danger?: boolean;
  icon?: LucideIcon;
}

export function Button({
  variant = "pill",
  primary = false,
  danger = false,
  icon: Icon,
  className,
  type = "button",
  children,
  ...rest
}: ButtonProps) {
  const classes = [
    "btn",
    `btn--${variant}`,
    primary ? "btn--primary" : "",
    danger ? "btn--danger" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} {...rest}>
      {Icon ? <Icon size={iconSize.md} strokeWidth={iconStroke} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
