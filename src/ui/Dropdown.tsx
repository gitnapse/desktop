import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";
import { iconSize, iconStroke } from "./icon";

interface DropdownContextValue {
  close: () => void;
}

const DropdownContext = createContext<DropdownContextValue>({ close: () => undefined });

export interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  label?: string;
}

export function Dropdown({ trigger, children, align = "start", label }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuId = useId();

  const close = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (wrapperRef.current && target instanceof Node && !wrapperRef.current.contains(target)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    const firstItem = wrapperRef.current?.querySelector<HTMLButtonElement>(".dropdown__item");
    firstItem?.focus();

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, close]);

  return (
    <div className="dropdown" ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        className="dropdown__trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
      >
        {trigger}
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={`dropdown__menu dropdown__menu--${align} glass glass--regular`}
        >
          <DropdownContext.Provider value={{ close }}>
            {children}
          </DropdownContext.Provider>
        </div>
      ) : null}
    </div>
  );
}

export interface DropdownItemProps {
  onSelect: () => void;
  children: ReactNode;
  icon?: LucideIcon;
  disabled?: boolean;
}

export function DropdownItem({ onSelect, children, icon: Icon, disabled = false }: DropdownItemProps) {
  const { close } = useContext(DropdownContext);
  return (
    <button
      type="button"
      role="menuitem"
      className="dropdown__item"
      disabled={disabled}
      onClick={() => {
        onSelect();
        close();
      }}
    >
      {Icon ? <Icon size={iconSize.md} strokeWidth={iconStroke} aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
