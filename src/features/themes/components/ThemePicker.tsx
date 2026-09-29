import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, RefreshCw } from "lucide-react";
import { Button, Input, StatusLine } from "../../../ui";
import { useTheme } from "../../../app/ThemeProvider";
import { fetchRegistry, fetchTheme, type ThemeRegistryEntry } from "../../../lib/themes";
import "../../../features/themes/themes.css";

function ThemePreview({
  background,
  foreground,
  name,
}: {
  background: string;
  foreground: string;
  name: string;
}) {
  return (
    <span className="themecard__preview" style={{ background, color: foreground }}>
      <span className="themecard__sample" style={{ color: foreground }}>
        Aa
      </span>
      <span className="themecard__name" style={{ color: foreground }}>
        {name}
      </span>
    </span>
  );
}

export function ThemePicker() {
  const { activeTheme, setThemeByName } = useTheme();
  const [filter, setFilter] = useState("");

  const registry = useQuery({
    queryKey: ["theme-registry"],
    queryFn: fetchRegistry,
    staleTime: 6 * 60 * 60 * 1000,
    retry: 1,
  });

  const apply = useMutation({
    mutationFn: async (entry: ThemeRegistryEntry) => {
      if (!registry.data) {
        throw new Error("Theme registry unavailable");
      }
      return fetchTheme(registry.data, entry.file);
    },
    onSuccess: (colors) => setThemeByName(colors.name, colors),
  });

  const themes = registry.data?.themes ?? [];
  const filtered = useMemo(() => {
    const query = filter.trim().toLowerCase();
    if (query.length === 0) {
      return themes;
    }
    return themes.filter(
      (entry) =>
        entry.name.toLowerCase().includes(query) ||
        (entry.description ?? "").toLowerCase().includes(query),
    );
  }, [themes, filter]);

  return (
    <div className="themepicker">
      <div className="themepicker__head">
        <p className="t-label">Registry theme</p>
        {activeTheme ? (
          <Button variant="technical" onClick={() => setThemeByName(null)}>
            Reset to default
          </Button>
        ) : null}
      </div>

      {registry.isPending ? <StatusLine kind="loading" message="loading registry" /> : null}
      {registry.isError ? (
        <div className="settings-row">
          <StatusLine kind="error" message={registry.error.message} />
          <Button variant="technical" icon={RefreshCw} onClick={() => void registry.refetch()}>
            Retry
          </Button>
        </div>
      ) : null}

      {apply.isPending ? <StatusLine kind="loading" message="applying theme" /> : null}
      {apply.isError ? <StatusLine kind="error" message={apply.error.message} /> : null}

      {registry.isSuccess ? (
        <>
          <Input
            label="Filter"
            value={filter}
            spellCheck={false}
            placeholder="Search themes"
            onChange={(event) => setFilter(event.target.value)}
          />
          <ul className="themegrid" aria-label="Themes">
            {filtered.map((entry) => {
              const selected = activeTheme?.name === entry.name;
              return (
                <li key={entry.name}>
                  <button
                    type="button"
                    className="themecard"
                    data-selected={selected ? "true" : undefined}
                    aria-pressed={selected}
                    disabled={apply.isPending}
                    onClick={() => apply.mutate(entry)}
                  >
                    <ThemePreview
                      background={entry.background}
                      foreground={entry.foreground}
                      name={entry.name}
                    />
                    <span className="themecard__body">
                      <span className="themecard__title">
                        {entry.name}
                        {selected ? (
                          <Check size={14} strokeWidth={1.5} aria-hidden="true" />
                        ) : null}
                      </span>
                      {entry.description ? (
                        <span className="t-caption themecard__desc">{entry.description}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {filtered.length === 0 ? <p className="t-label">[NO THEMES MATCH FILTER]</p> : null}
        </>
      ) : null}
    </div>
  );
}
