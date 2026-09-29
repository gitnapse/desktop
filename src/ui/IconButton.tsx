import type { ComponentPropsWithoutRef } from "react";
import type { LucideIcon } from "lucide-react";
import { iconSize, iconStroke } from "./icon";

export interface IconButtonProps extends Omit<ComponentPropsWithoutRef<"button">, "aria-label"> {
  icon: LucideIcon;
  label: string;
  size?: "sm" | "md";
}

export function IconButton({
  icon: Icon,
  label,
  size = "md",
  className,
  type = "button",
  ...rest
}: IconButtonProps) {
  const classes = ["iconbtn", size === "sm" ? "iconbtn--sm" : "", className ?? ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button type={type} className={classes} aria-label={label} {...rest}>
      <Icon size={size === "sm" ? iconSize.sm : iconSize.md} strokeWidth={iconStroke} aria-hidden="true" />
    </button>
  );
}
