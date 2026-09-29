export type ThemePreference = "dark" | "light" | "system";
export type ResolvedTheme = "dark" | "light";
export type GlassLevel = "thin" | "regular" | "thick";
export type TransparencyPreference = "default" | "reduce";
export type RuntimeKind = "tauri" | "web";

export interface AppearancePreferences {
  theme: ThemePreference;
  glass: GlassLevel;
  transparency: TransparencyPreference;
}

export const appearanceStorageKeys = {
  theme: "gitnapse.theme",
  glass: "gitnapse.glass",
  transparency: "gitnapse.transparency",
} as const;

export const defaultAppearance: AppearancePreferences = {
  theme: "system",
  glass: "regular",
  transparency: "default",
};

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "dark" || value === "light" || value === "system";
}

export function isGlassLevel(value: unknown): value is GlassLevel {
  return value === "thin" || value === "regular" || value === "thick";
}

export function isTransparencyPreference(value: unknown): value is TransparencyPreference {
  return value === "default" || value === "reduce";
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDarkTheme: boolean,
): ResolvedTheme {
  if (preference === "system") {
    return systemPrefersDarkTheme ? "dark" : "light";
  }
  return preference;
}

export function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export type StorageReader = (key: string) => string | null;

export function parseAppearance(read: StorageReader): AppearancePreferences {
  const theme = read(appearanceStorageKeys.theme);
  const glass = read(appearanceStorageKeys.glass);
  const transparency = read(appearanceStorageKeys.transparency);
  return {
    theme: isThemePreference(theme) ? theme : defaultAppearance.theme,
    glass: isGlassLevel(glass) ? glass : defaultAppearance.glass,
    transparency: isTransparencyPreference(transparency)
      ? transparency
      : defaultAppearance.transparency,
  };
}

export function readAppearance(): AppearancePreferences {
  if (typeof localStorage === "undefined") {
    return defaultAppearance;
  }
  return parseAppearance((key) => localStorage.getItem(key));
}

export type StorageWriter = (key: string, value: string) => void;

export function persistAppearance(preferences: AppearancePreferences, write: StorageWriter): void {
  write(appearanceStorageKeys.theme, preferences.theme);
  write(appearanceStorageKeys.glass, preferences.glass);
  write(appearanceStorageKeys.transparency, preferences.transparency);
}

export function storeAppearance(preferences: AppearancePreferences): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  persistAppearance(preferences, (key, value) => localStorage.setItem(key, value));
}

export function applyAppearance(
  preferences: AppearancePreferences,
  theme: ResolvedTheme,
  runtime: RuntimeKind,
): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.dataset.themePreference = preferences.theme;
  root.dataset.glass = preferences.glass;
  root.dataset.runtime = runtime;
  if (preferences.transparency === "reduce") {
    root.dataset.transparency = "reduce";
  } else {
    delete root.dataset.transparency;
  }
}

export function initAppearance(runtime: RuntimeKind): ResolvedTheme {
  const preferences = readAppearance();
  const theme = resolveTheme(preferences.theme, systemPrefersDark());
  applyAppearance(preferences, theme, runtime);
  return theme;
}
