import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderOpen, RefreshCw } from "lucide-react";
import { Page } from "../Page";
import { Button, Checkbox, Input, Select, StatusLine, Tabs } from "../../ui";
import { AuthFlow } from "../AuthFlow";
import { useTheme } from "../ThemeProvider";
import * as bridge from "../../lib/bridge";
import { mockCommands } from "../../lib/mock";
import { isGlassLevel, isThemePreference } from "../../lib/theme";

const themeOptions = [
  { value: "system", label: "System" },
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
];

const glassOptions = [
  { value: "thin", label: "Thin — subtle blur, cheapest" },
  { value: "regular", label: "Regular — default material" },
  { value: "thick", label: "Thick — heavy blur, modals" },
];

function CloneDirSection() {
  const queryClient = useQueryClient();
  const dir = useQuery({ queryKey: ["clone-dir"], queryFn: bridge.cloneDir });
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? dir.data ?? "";

  const save = useMutation({
    mutationFn: (next: string) => bridge.setCloneDir(next),
    onSuccess: (saved) => {
      queryClient.setQueryData(["clone-dir"], saved);
      setDraft(null);
    },
  });

  const pick = useMutation({
    mutationFn: bridge.pickDirectory,
    onSuccess: (picked) => {
      if (picked) {
        setDraft(picked);
      }
    },
  });

  const dirty = draft !== null && draft !== (dir.data ?? "");

  return (
    <section className="section glass-flat" aria-labelledby="settings-clone">
      <header className="section__head">
        <p className="t-label section__label">Local</p>
        <h2 id="settings-clone" className="section__title">
          Clone destination
        </h2>
      </header>
      <Input
        label="Directory"
        mono
        spellCheck={false}
        value={value}
        placeholder={dir.isPending ? "Loading…" : "/home/you/projects"}
        hint="Clones land here; the core config keeps the value."
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="settings-row">
        <div className="settings-row__controls">
          <Button
            variant="technical"
            icon={FolderOpen}
            disabled={pick.isPending}
            onClick={() => pick.mutate()}
          >
            Choose…
          </Button>
          <Button
            primary
            disabled={!dirty || save.isPending}
            onClick={() => {
              if (draft !== null) {
                save.mutate(draft);
              }
            }}
          >
            Save
          </Button>
        </div>
        <div className="settings-stack">
          {dir.isPending ? <StatusLine kind="loading" /> : null}
          {dir.isError ? <StatusLine kind="error" message={dir.error.message} /> : null}
          {pick.isError ? <StatusLine kind="error" message={pick.error.message} /> : null}
          {save.isPending ? <StatusLine kind="loading" /> : null}
          {save.isError ? <StatusLine kind="error" message={save.error.message} /> : null}
          {save.isSuccess ? <StatusLine kind="saved" message={save.data} /> : null}
        </div>
      </div>
    </section>
  );
}

function ServerSection() {
  const queryClient = useQueryClient();
  const status = useQuery({
    queryKey: ["server-status"],
    queryFn: bridge.serverStatus,
    retry: false,
  });

  const start = useMutation({
    mutationFn: bridge.serverStart,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["server-status"] });
    },
  });
  const stop = useMutation({
    mutationFn: bridge.serverStop,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["server-status"] });
    },
  });

  const info = status.data;
  const running = info?.state === "running";
  const settled = status.isSuccess && info !== undefined;
  const startDisabled =
    start.isPending || (settled && (running || info.state === "starting"));
  const stopDisabled = stop.isPending || !settled || !running;

  return (
    <section className="section glass-flat" aria-labelledby="settings-server">
      <header className="section__head">
        <p className="t-label section__label">Remote</p>
        <h2 id="settings-server" className="section__title">
          gitnapse-server
        </h2>
      </header>
      <div className="settings-row">
        <div className="settings-row__controls">
          {status.isPending ? <StatusLine kind="loading" message="probing health" /> : null}
          {status.isError ? <StatusLine kind="warn" message="status unavailable" /> : null}
          {settled ? (
            <StatusLine
              kind={running ? "saved" : "warn"}
              message={`${info.state.toUpperCase()}${info.version ? ` v${info.version}` : ""} · ${
                info.owned ? "OWNED" : "EXTERNAL"
              }`}
            />
          ) : null}
        </div>
        <div className="settings-row__controls">
          <Button variant="technical" disabled={startDisabled} onClick={() => start.mutate()}>
            Start
          </Button>
          <Button variant="technical" disabled={stopDisabled} onClick={() => stop.mutate()}>
            Stop
          </Button>
          <Button variant="technical" icon={RefreshCw} onClick={() => void status.refetch()}>
            Retry health
          </Button>
        </div>
      </div>
      <div className="settings-stack">
        <div>
          <p className="t-label">Base URL</p>
          <p className="t-data">{info?.url ?? "http://127.0.0.1:8787"}</p>
        </div>
        <p className="t-caption">
          Loopback only; override with the GITNAPSE_SERVER_URL environment variable.
        </p>
        {status.isError ? <StatusLine kind="error" message={status.error.message} /> : null}
        {start.isError ? <StatusLine kind="error" message={start.error.message} /> : null}
        {stop.isError ? <StatusLine kind="error" message={stop.error.message} /> : null}
      </div>
    </section>
  );
}

function AboutSection() {
  const runtime = bridge.isTauri() ? "Tauri 2" : "Browser preview";
  return (
    <section className="section glass-flat" aria-labelledby="settings-about">
      <header className="section__head">
        <p className="t-label section__label">Build</p>
        <h2 id="settings-about" className="section__title">
          About
        </h2>
      </header>
      <dl className="about">
        <div>
          <dt className="t-label">Application</dt>
          <dd className="t-data">GitNapse Desktop 0.1.0</dd>
        </div>
        <div>
          <dt className="t-label">Runtime</dt>
          <dd className="t-data">{runtime}</dd>
        </div>
        <div>
          <dt className="t-label">UI</dt>
          <dd className="t-data">React 19 · Vite 8 · TypeScript 7</dd>
        </div>
        <div>
          <dt className="t-label">Command surface</dt>
          <dd className="t-data">{`${mockCommands.length} typed commands`}</dd>
        </div>
      </dl>
    </section>
  );
}

export default function SettingsPage() {
  const { preferences, setTheme, setGlass, setTransparency } = useTheme();

  return (
    <Page title="Settings" label="GitNapse // Configuration">
      <div className="settings-stack">
        <section className="section glass-flat" aria-labelledby="settings-auth">
          <header className="section__head">
            <p className="t-label section__label">Account</p>
            <h2 id="settings-auth" className="section__title">
              Authentication
            </h2>
          </header>
          <AuthFlow variant="settings" />
        </section>

        <CloneDirSection />

        <section className="section glass-flat" aria-labelledby="settings-appearance">
          <header className="section__head">
            <p className="t-label section__label">Appearance</p>
            <h2 id="settings-appearance" className="section__title">
              Theme and material
            </h2>
          </header>
          <div className="settings-stack">
            <div>
              <p className="t-label">Theme</p>
              <Tabs
                ariaLabel="Theme preference"
                value={preferences.theme}
                items={themeOptions}
                onChange={(value) => {
                  if (isThemePreference(value)) {
                    setTheme(value);
                  }
                }}
              />
            </div>
            <Select
              label="Glass level"
              value={preferences.glass}
              options={glassOptions}
              onChange={(event) => {
                if (isGlassLevel(event.target.value)) {
                  setGlass(event.target.value);
                }
              }}
            />
            <Checkbox
              label="Reduce transparency"
              description="opaque surfaces, backdrop blur disabled."
              checked={preferences.transparency === "reduce"}
              onChange={(event) => {
                setTransparency(event.target.checked ? "reduce" : "default");
              }}
            />
          </div>
        </section>

        <ServerSection />
        <AboutSection />
      </div>
    </Page>
  );
}
