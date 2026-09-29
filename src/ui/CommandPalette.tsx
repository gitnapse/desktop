import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { Search } from "lucide-react";
import { iconSize, iconStroke } from "./icon";

export interface Command {
  id: string;
  label: string;
  hint?: string;
  keywords?: readonly string[];
  run: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  commands: readonly Command[];
  placeholder?: string;
}

export function CommandPalette({
  open,
  onClose,
  commands,
  placeholder = "Type a command or search",
}: CommandPaletteProps) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length === 0) {
      return commands;
    }
    return commands.filter((command) => {
      const haystack = [command.label, command.hint ?? "", ...(command.keywords ?? [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(needle);
    });
  }, [commands, query]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
      setQuery("");
      setActiveIndex(0);
    }
    if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function run(command: Command | undefined) {
    if (!command) {
      return;
    }
    onClose();
    command.run();
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(results.length - 1, 0)));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      run(results[activeIndex]);
    }
  }

  const active = results[activeIndex];

  return (
    <dialog
      ref={dialogRef}
      className="palette"
      aria-label="Command palette"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) {
          onClose();
        }
      }}
    >
      <div className="glass glass--thick glass--scrim palette__panel">
        <div className="palette__search">
          <Search size={iconSize.md} strokeWidth={iconStroke} aria-hidden="true" />
          <input
            ref={inputRef}
            className="palette__input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            aria-label="Command search"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-results"
            aria-activedescendant={active ? `palette-option-${active.id}` : undefined}
            spellCheck={false}
          />
        </div>
        <ul id="palette-results" className="palette__results" role="listbox" aria-label="Commands">
          {results.length === 0 ? (
            <li className="palette__result">
              <span className="t-label">[NO MATCHING COMMANDS]</span>
            </li>
          ) : (
            results.map((command, index) => (
              <li key={command.id}>
                <button
                  type="button"
                  id={`palette-option-${command.id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  data-active={index === activeIndex}
                  className="palette__result"
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => run(command)}
                >
                  <span className="palette__result__label">{command.label}</span>
                  {command.hint ? (
                    <span className="palette__result__hint">{command.hint}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="palette__foot">
          <span className="t-label">↑↓ NAVIGATE · ENTER RUN · ESC CLOSE</span>
          <kbd className="kbd">K</kbd>
        </div>
      </div>
    </dialog>
  );
}
