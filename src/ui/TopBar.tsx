import { useState, type FormEvent, type ReactNode } from "react";
import { Command as CommandIcon, Search } from "lucide-react";
import { iconSize, iconStroke } from "./icon";
import { Button } from "./Button";

export interface TopBarProps {
  onOpenPalette: () => void;
  onSearch: (query: string) => void;
  auth?: ReactNode;
  notifications?: ReactNode;
  paletteShortcut?: string;
}

export function TopBar({
  onOpenPalette,
  onSearch,
  auth,
  notifications,
  paletteShortcut = "⌘K",
}: TopBarProps) {
  const [query, setQuery] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = query.trim();
    if (next.length > 0) {
      onSearch(next);
    }
  }

  return (
    <header className="topbar glass glass--thin">
      <form className="topbar__search" role="search" onSubmit={submit}>
        <Search size={iconSize.md} strokeWidth={iconStroke} aria-hidden="true" />
        <input
          className="input topbar__search-input"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search repositories, users, organizations, code"
          aria-label="Search GitHub"
          spellCheck={false}
        />
      </form>
      <div className="topbar__spacer" />
      <div className="topbar__actions">
        {notifications}
        {auth}
        <Button variant="technical" icon={CommandIcon} onClick={onOpenPalette}>
          Commands
          <kbd className="kbd">{paletteShortcut}</kbd>
        </Button>
      </div>
    </header>
  );
}
