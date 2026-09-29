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
import {
  buildThemeTokens,
  cacheTheme,
  clearCachedTheme,
  clearThemeTokens,
  applyThemeTokens,
  readCachedTheme,
  type CachedTheme,
  type ThemeColors,
} from "../lib/themes";
import { isTauri } from "../lib/bridge";

interface ThemeContextValue {
  preferences: AppearancePreferences;
  resolvedTheme: ResolvedTheme;
  activeTheme: CachedTheme | null;
  setTheme: (theme: ThemePreference) => void;
  setGlass: (glass: GlassLevel) => void;
  setTransparency: (transparency: TransparencyPreference) => void;
  setThemeByName: (name: string | null, colors?: ThemeColors) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const runtime: RuntimeKind = isTauri() ? "tauri" : "web";
  const [preferences, setPreferences] = useState<AppearancePreferences>(() => readAppearance());
  const [systemDark, setSystemDark] = useState<boolean>(() => systemPrefersDark());
  const [activeTheme, setActiveTheme] = useState<CachedTheme | null>(() => readCachedTheme());

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  const baseTheme = resolveTheme(preferences.theme, systemDark);
  const resolvedTheme: ResolvedTheme = activeTheme
    ? activeTheme.colors.dark
      ? "dark"
      : "light"
    : baseTheme;

  useEffect(() => {
    applyAppearance(preferences, resolvedTheme, runtime);
    const root = document.documentElement;
    if (activeTheme) {
      applyThemeTokens(activeTheme.tokens, root);
      root.dataset.themeName = activeTheme.name;
    } else {
      clearThemeTokens(root);
      delete root.dataset.themeName;
    }
    storeAppearance(preferences);
  }, [preferences, resolvedTheme, runtime, activeTheme]);

  const update = useCallback((patch: Partial<AppearancePreferences>) => {
    setPreferences((current) => ({ ...current, ...patch }));
  }, []);

  const setThemeByName = useCallback((name: string | null, colors?: ThemeColors) => {
    if (!name || !colors) {
      clearCachedTheme();
      setActiveTheme(null);
      return;
    }
    const cached: CachedTheme = { name, colors, tokens: buildThemeTokens(colors) };
    cacheTheme(cached);
    setActiveTheme(cached);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preferences,
      resolvedTheme,
      activeTheme,
      setTheme: (theme) => update({ theme }),
      setGlass: (glass) => update({ glass }),
      setTransparency: (transparency) => update({ transparency }),
      setThemeByName,
      toggleTheme: () => {
        if (activeTheme) {
          setThemeByName(null);
        }
        update({ theme: resolvedTheme === "dark" ? "light" : "dark" });
      },
    }),
    [preferences, resolvedTheme, activeTheme, update, setThemeByName],
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
