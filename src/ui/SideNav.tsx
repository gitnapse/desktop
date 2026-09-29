import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { iconSize, iconStroke } from "./icon";

export interface SideNavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface SideNavProps {
  items: readonly SideNavItem[];
  brand?: ReactNode;
  footer?: ReactNode;
}

export function SideNav({ items, brand, footer }: SideNavProps) {
  return (
    <nav className="sidenav glass glass--thin" aria-label="Primary">
      {brand ? <div className="sidenav__brand">{brand}</div> : null}
      <ul className="sidenav__list">
        {items.map((item, index) => {
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <NavLink to={item.to} end={item.end} className="sidenav__link">
                <span className="sidenav__index t-label">{String(index + 1).padStart(2, "0")}</span>
                <Icon size={iconSize.md} strokeWidth={iconStroke} aria-hidden="true" />
                <span className="sidenav__label t-label">{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
      {footer ? <div className="sidenav__footer">{footer}</div> : null}
    </nav>
  );
}
