import { NavLink } from "react-router-dom";

export interface TabItem {
  value: string;
  label: string;
  to?: string;
  end?: boolean;
}

export interface TabsProps {
  items: readonly TabItem[];
  value: string;
  ariaLabel: string;
  onChange?: (value: string) => void;
}

export function Tabs({ items, value, ariaLabel, onChange }: TabsProps) {
  return (
    <nav className="tabs" aria-label={ariaLabel}>
      {items.map((item) =>
        item.to ? (
          <NavLink key={item.value} to={item.to} end={item.end} className="tabs__tab">
            {item.label}
          </NavLink>
        ) : (
          <button
            key={item.value}
            type="button"
            className="tabs__tab"
            aria-current={item.value === value ? "true" : undefined}
            onClick={() => onChange?.(item.value)}
          >
            {item.label}
          </button>
        ),
      )}
    </nav>
  );
}
