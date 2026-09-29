import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyAppearance,
  readAppearance,
  resolveTheme,
  storeAppearance,
  systemPrefersDark,
  type AppearancePreferences,
  type GlassLevel,
  type ResolvedTheme,
  type RuntimeKind,
  type ThemePreference,
  type TransparencyPreference,
} from "../lib/theme";
import { isTauri } from "../lib/bridge";

interface ThemeContextValue {
  preferences: AppearancePreferences;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  setGlass: (glass: GlassLevel) => void;
  setTransparency: (transparency: TransparencyPreference) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const runtime: RuntimeKind = isTauri() ? "tauri" : "web";
  const [preferences, setPreferences] = useState<AppearancePreferences>(() => readAppearance());
  const [systemDark, setSystemDark] = useState<boolean>(() => systemPrefersDark());

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  const resolvedTheme = resolveTheme(preferences.theme, systemDark);

  useEffect(() => {
    applyAppearance(preferences, resolvedTheme, runtime);
    storeAppearance(preferences);
  }, [preferences, resolvedTheme, runtime]);

  const update = useCallback((patch: Partial<AppearancePreferences>) => {
    setPreferences((current) => ({ ...current, ...patch }));
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preferences,
      resolvedTheme,
      setTheme: (theme) => update({ theme }),
      setGlass: (glass) => update({ glass }),
      setTransparency: (transparency) => update({ transparency }),
      toggleTheme: () => update({ theme: resolvedTheme === "dark" ? "light" : "dark" }),
    }),
    [preferences, resolvedTheme, update],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside a ThemeProvider");
  }
  return context;
}
