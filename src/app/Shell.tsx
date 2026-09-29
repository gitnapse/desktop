import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Bell, FolderGit2, Home, Search, Settings, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  CommandPalette,
  Input,
  Modal,
  SideNav,
  StatusLine,
  TopBar,
  type Command,
} from "../ui";
import { AuthChip } from "./AuthChip";
import { CloneDialog } from "./CloneDialog";
import { NotificationsBell } from "./NotificationsBell";
import { useTheme } from "./ThemeProvider";
import { useServerAutoStart } from "./server";
import { authQueryKey, useSignOut } from "./auth";
import * as bridge from "../lib/bridge";

function focusTopBarSearch() {
  document.querySelector<HTMLInputElement>(".topbar__search-input")?.focus();
}

interface LookupPromptProps {
  kind: "user" | "repo";
  open: boolean;
  onClose: () => void;
}

function LookupPrompt({ kind, open, onClose }: LookupPromptProps) {
  const [value, setValue] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setValue("");
    }
  }, [open]);

  const cleaned = value.trim().replace(/^@/, "");
  const valid =
    kind === "user"
      ? cleaned.length > 0
      : /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/.test(cleaned);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid) {
      return;
    }
    navigate(kind === "user" ? `/users/${encodeURIComponent(cleaned)}` : `/repos/${cleaned}`);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={kind === "user" ? "Open user" : "Open repository"}
      footer={
        <>
          <Button variant="technical" onClick={onClose}>
            Close
          </Button>
          <Button type="submit" form="lookup-form" primary disabled={!valid}>
            Open
          </Button>
        </>
      }
    >
      <form id="lookup-form" className="settings-stack" onSubmit={submit}>
        <Input
          label={kind === "user" ? "Login" : "Repository"}
          mono
          autoFocus
          spellCheck={false}
          placeholder={kind === "user" ? "octocat" : "gitnapse/desktop"}
          hint={
            kind === "user"
              ? "GitHub login, with or without the @ prefix."
              : "Owner and name, for example gitnapse/desktop."
          }
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </form>
    </Modal>
  );
}

export function Shell() {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const [lookup, setLookup] = useState<"user" | "repo" | null>(null);
  const navigate = useNavigate();
  const { resolvedTheme, toggleTheme } = useTheme();
  useServerAutoStart();
  const signOut = useSignOut();
  const auth = useQuery({ queryKey: authQueryKey, queryFn: bridge.authStatus });
  const account = useQuery({
    queryKey: ["api-user"],
    queryFn: bridge.apiUser,
    enabled: Boolean(auth.data?.has_token),
    retry: false,
  });

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const navItems = useMemo<Array<{ to: string; label: string; icon: typeof Home; end?: boolean }>>(
    () => {
      const items: Array<{ to: string; label: string; icon: typeof Home; end?: boolean }> = [
        { to: "/", label: "Home", icon: Home, end: true },
        { to: "/search", label: "Search", icon: Search },
        { to: "/local", label: "Local", icon: FolderGit2 },
        { to: "/notifications", label: "Inbox", icon: Bell },
      ];
      if (account.data?.login) {
        items.push({ to: `/users/${account.data.login}`, label: "Profile", icon: User });
      }
      items.push({ to: "/settings", label: "Settings", icon: Settings });
      return items;
    },
    [account.data?.login],
  );

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [
      {
        id: "home",
        label: "Go to home",
        hint: "G H",
        keywords: ["dashboard", "overview"],
        run: () => navigate("/"),
      },
      {
        id: "search",
        label: "Search GitHub",
        hint: "G S",
        keywords: ["repositories", "users", "code"],
        run: () => navigate("/search"),
      },
      {
        id: "search-focus",
        label: "Focus search field",
        hint: "/",
        keywords: ["query", "input", "topbar"],
        run: focusTopBarSearch,
      },
      {
        id: "local",
        label: "Open local repositories",
        hint: "G L",
        keywords: ["clone", "git", "working tree"],
        run: () => navigate("/local"),
      },
      {
        id: "notifications",
        label: "Open notifications",
        hint: "G N",
        keywords: ["inbox", "unread", "mentions"],
        run: () => navigate("/notifications"),
      },
      {
        id: "settings",
        label: "Open settings",
        hint: "G ,",
        keywords: ["appearance", "glass", "theme", "auth"],
        run: () => navigate("/settings"),
      },
      {
        id: "clone",
        label: "Clone repository…",
        hint: "C",
        keywords: ["git", "download", "checkout"],
        run: () => setCloneOpen(true),
      },
      {
        id: "open-user",
        label: "Open user by name…",
        hint: "@",
        keywords: ["profile", "people", "login"],
        run: () => setLookup("user"),
      },
      {
        id: "open-repo",
        label: "Open repository by name…",
        hint: "R",
        keywords: ["owner/name", "repo", "repository"],
        run: () => setLookup("repo"),
      },
      {
        id: "theme",
        label: `Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`,
        hint: "T",
        keywords: ["appearance", "mode", "dark", "light"],
        run: toggleTheme,
      },
    ];
    if (auth.data?.has_token) {
      const login = auth.data.login;
      if (login) {
        list.splice(4, 0, {
          id: "profile",
          label: `Open my profile (@${login})`,
          hint: "G P",
          keywords: ["user", "account"],
          run: () => navigate(`/users/${login}`),
        });
      }
      list.push({
        id: "signout",
        label: "Sign out",
        hint: "Q",
        keywords: ["logout", "exit"],
        run: () => signOut.mutate(),
      });
    } else {
      list.push({
        id: "signin",
        label: "Sign in",
        hint: "G A",
        keywords: ["auth", "token", "oauth"],
        run: () => navigate("/settings"),
      });
    }
    return list;
  }, [navigate, resolvedTheme, toggleTheme, signOut, auth.data]);

  const preview = !bridge.isTauri();

  return (
    <div className="app">
      <SideNav
        items={navItems}
        brand={
          <>
            <span className="sidenav__wordmark">GitNapse</span>
            <span className="t-label sidenav__tagline">GitHub dashboard</span>
          </>
        }
        footer={
          <>
            <span className="t-label">v0.1.0 · F4</span>
            <span className="t-label">Tauri 2 · React 19</span>
          </>
        }
      />
      <div className="app__main">
        <TopBar
          onOpenPalette={() => setPaletteOpen(true)}
          onSearch={(query) => navigate(`/search?q=${encodeURIComponent(query)}`)}
          notifications={<NotificationsBell />}
          auth={<AuthChip />}
        />
        {preview ? (
          <div className="app__notice">
            <StatusLine kind="info" message="PREVIEW — MOCKS ACTIVE" />
            <span className="t-caption">Run `npm run tauri dev` for the real bridge.</span>
          </div>
        ) : null}
        <main className="app__content">
          <Outlet />
        </main>
      </div>
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        commands={commands}
      />
      <CloneDialog open={cloneOpen} onClose={() => setCloneOpen(false)} />
      <LookupPrompt kind={lookup ?? "user"} open={lookup !== null} onClose={() => setLookup(null)} />
    </div>
  );
}
