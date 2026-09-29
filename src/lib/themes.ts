import { contrast, luminance, parseHexColor, type RGB } from "./contrast";

export interface ThemeColors {
  name: string;
  dark: boolean;
  background: string;
  foreground: string;
  accent: string;
  accent2: string;
  accent3: string;
  selectionFg: string | null;
}

export interface ThemeRegistryEntry {
  name: string;
  file: string;
  description?: string;
  dark: boolean;
  background: string;
  foreground: string;
}

export interface ThemeRegistry {
  version: number;
  base_url: string;
  themes: ThemeRegistryEntry[];
}

export const themeNameStorageKey = "gitnapse.themeName";
export const themeTokenCacheKey = "gitnapse.themeTokens";

export const THEME_REGISTRY_URL =
  "https://raw.githubusercontent.com/gitnapse/themes/main/index.json";

export function parseColor(input: unknown): RGB {
  if (Array.isArray(input) && input.length >= 3) {
    const channels = input.slice(0, 3).map((value) => Number(value));
    if (channels.every((value) => Number.isFinite(value))) {
      return [
        clampChannel(channels[0] ?? 0),
        clampChannel(channels[1] ?? 0),
        clampChannel(channels[2] ?? 0),
      ];
    }
  }
  if (typeof input === "string") {
    return parseHexColor(normalizeHex(input));
  }
  throw new Error(`Unsupported color value: ${String(input)}`);
}

function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function normalizeHex(value: string): string {
  const trimmed = value.trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{3}$/.test(trimmed)) {
    return `#${trimmed
      .split("")
      .map((char) => char + char)
      .join("")}`;
  }
  if (/^[0-9a-fA-F]{6}$/.test(trimmed)) {
    return `#${trimmed}`;
  }
  throw new Error(`Invalid hex color: ${value}`);
}

export function toHex(color: RGB): string {
  return `#${color.map((channel) => clampChannel(channel).toString(16).padStart(2, "0")).join("")}`;
}

export function toRgbChannels(color: RGB): string {
  return `${color[0]} ${color[1]} ${color[2]}`;
}

export function toRgba(color: RGB, alpha: number): string {
  return `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${round(alpha, 3)})`;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  const amount = Math.max(0, Math.min(1, t));
  return [
    clampChannel(a[0] + (b[0] - a[0]) * amount),
    clampChannel(a[1] + (b[1] - a[1]) * amount),
    clampChannel(a[2] + (b[2] - a[2]) * amount),
  ];
}

export interface Hsl {
  h: number;
  s: number;
  l: number;
}

export function toHsl(color: RGB): Hsl {
  const [r, g, b] = color.map((channel) => channel / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const l = (max + min) / 2;
  if (delta === 0) {
    return { h: 0, s: 0, l };
  }
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) {
    h = 60 * (((g - b) / delta) % 6);
  } else if (max === g) {
    h = 60 * ((b - r) / delta + 2);
  } else {
    h = 60 * ((r - g) / delta + 4);
  }
  if (h < 0) {
    h += 360;
  }
  return { h, s, l };
}

export function fromHsl({ h, s, l }: Hsl): RGB {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((hp % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;
  if (hp < 1) {
    [r, g, b] = [chroma, x, 0];
  } else if (hp < 2) {
    [r, g, b] = [x, chroma, 0];
  } else if (hp < 3) {
    [r, g, b] = [0, chroma, x];
  } else if (hp < 4) {
    [r, g, b] = [0, x, chroma];
  } else if (hp < 5) {
    [r, g, b] = [x, 0, chroma];
  } else {
    [r, g, b] = [chroma, 0, x];
  }
  const m = l - chroma / 2;
  return [
    clampChannel((r + m) * 255),
    clampChannel((g + m) * 255),
    clampChannel((b + m) * 255),
  ];
}

/**
 * Nudges a color's lightness until it clears `min` contrast against `backdrop`.
 * Hue and saturation are preserved; the direction follows whichever side of the
 * backdrop the color sits on.
 */
export function ensureContrast(color: RGB, backdrop: RGB, min: number): RGB {
  if (contrast(color, backdrop) >= min) {
    return color;
  }
  const backdropLight = luminance(backdrop) > 0.5;
  const hsl = toHsl(color);
  let best = color;
  for (let step = 0; step <= 100; step += 1) {
    const l = backdropLight ? Math.max(0, hsl.l - step / 100) : Math.min(1, hsl.l + step / 100);
    const candidate = fromHsl({ ...hsl, l });
    best = candidate;
    if (contrast(candidate, backdrop) >= min) {
      return candidate;
    }
    if (l === 0 || l === 1) {
      break;
    }
  }
  return best;
}

export function stripJsonComments(input: string): string {
  let out = "";
  let inString = false;
  let stringChar = "";
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i] ?? "";
    const next = input[i + 1] ?? "";
    if (inString) {
      out += ch;
      if (ch === "\\") {
        out += next;
        i += 1;
        continue;
      }
      if (ch === stringChar) {
        inString = false;
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      inString = true;
      stringChar = ch;
      out += ch;
      continue;
    }
    if (ch === "/" && next === "/") {
      while (i < input.length && input[i] !== "\n") {
        i += 1;
      }
      out += "\n";
      continue;
    }
    if (ch === "/" && next === "*") {
      i += 2;
      while (i < input.length && !(input[i] === "*" && input[i + 1] === "/")) {
        i += 1;
      }
      i += 1;
      continue;
    }
    out += ch;
  }
  return out.replace(/,(\s*[}\]])/g, "$1");
}

export function parseThemeFile(
  text: string,
  entry?: Pick<ThemeRegistryEntry, "name" | "dark">,
): ThemeColors {
  const raw = JSON.parse(stripJsonComments(text)) as Record<string, unknown>;
  const background = parseColor(raw.background);
  const foreground = parseColor(raw.foreground);
  return {
    name: typeof raw.theme_name === "string" ? raw.theme_name : entry?.name ?? "Custom",
    dark: entry?.dark ?? luminance(background) < 0.5,
    background: toHex(background),
    foreground: toHex(foreground),
    accent: toHex(parseColor(raw.accent)),
    accent2: toHex(parseColor(raw.accent2)),
    accent3: toHex(parseColor(raw.accent3)),
    selectionFg: raw.selection_fg ? toHex(parseColor(raw.selection_fg)) : null,
  };
}

export function themeFileUrl(registry: ThemeRegistry, file: string): string {
  if (/^https?:\/\//.test(file)) {
    return file;
  }
  return `${registry.base_url.replace(/\/$/, "")}/${file.replace(/^\//, "")}`;
}

export interface ThemeStatus {
  ok: RGB;
  warn: RGB;
  err: RGB;
  info: RGB;
}

interface AccentGroup {
  hue: number;
  color: RGB;
}

function classifyAccent(color: RGB): keyof ThemeStatus | null {
  const { h, s } = toHsl(color);
  if (s < 0.12) {
    return null;
  }
  if (h >= 330 || h < 25) {
    return "err";
  }
  if (h >= 60 && h < 170) {
    return "ok";
  }
  if (h >= 170 && h < 330) {
    return "info";
  }
  return "warn";
}

const fallbackStatus: Record<"dark" | "light", ThemeStatus> = {
  dark: {
    ok: parseHexColor("#5db26e"),
    warn: parseHexColor("#d4a843"),
    err: parseHexColor("#ef6a72"),
    info: parseHexColor("#6ea8f7"),
  },
  light: {
    ok: parseHexColor("#2e6b3c"),
    warn: parseHexColor("#7a5c0f"),
    err: parseHexColor("#b3232a"),
    info: parseHexColor("#0057c2"),
  },
};

/**
 * Distributes the three theme accents across the four status roles by hue, so a
 * theme's red becomes error, its green becomes success, its blue/cyan becomes
 * info and any warm accent becomes warning. Missing roles fall back to the
 * built-in semantic colors for the theme's mode.
 */
export function distributeStatus(
  colors: ThemeColors,
  surface: RGB,
  surfaceRaised: RGB,
): ThemeStatus {
  const accents: RGB[] = [
    parseColor(colors.accent),
    parseColor(colors.accent2),
    parseColor(colors.accent3),
  ];
  const mode = colors.dark ? "dark" : "light";
  const result: ThemeStatus = { ...fallbackStatus[mode] };
  const groups: AccentGroup[] = accents.map((color) => ({ hue: toHsl(color).h, color }));
  const used = new Set<number>();

  for (const role of ["err", "ok", "info", "warn"] as const) {
    const match = groups.findIndex(
      (group, index) => !used.has(index) && classifyAccent(group.color) === role,
    );
    if (match >= 0) {
      used.add(match);
      result[role] = groups[match]?.color ?? result[role];
    }
  }

  const backdrops = [surface, surfaceRaised];
  for (const role of ["ok", "warn", "err", "info"] as const) {
    for (const backdrop of backdrops) {
      result[role] = ensureContrast(result[role], backdrop, 4.5);
    }
  }
  return result;
}

export type ThemeTokenMap = Record<string, string>;

export function buildThemeTokens(colors: ThemeColors): ThemeTokenMap {
  const bg = parseColor(colors.background);
  const fg = parseColor(colors.foreground);
  const dark = colors.dark;
  const towardFg = (amount: number) => mix(bg, fg, amount);

  const surface = towardFg(dark ? 0.07 : 0.05);
  const surfaceRaised = towardFg(dark ? 0.12 : 0.08);
  const line = towardFg(dark ? 0.16 : 0.11);
  const lineVisible = towardFg(dark ? 0.24 : 0.16);

  const inkStrong = dark ? mix(fg, [255, 255, 255], 0.2) : mix(fg, [0, 0, 0], 0.2);
  const ink = fg;
  const muted = ensureContrast(mix(fg, bg, 0.42), surfaceRaised, 4.5);
  const faint = mix(fg, bg, 0.6);

  const controlLine = ensureContrast(mix(fg, bg, 0.5), surfaceRaised, 3);
  const status = distributeStatus(colors, surface, surfaceRaised);

  const accent = parseColor(colors.accent);
  const accent2 = parseColor(colors.accent2);
  const accent3 = parseColor(colors.accent3);
  const focus = ensureContrast(accent, surfaceRaised, 3);
  const selectionInk: RGB = colors.selectionFg
    ? parseColor(colors.selectionFg)
    : contrast(accent, [255, 255, 255]) >= contrast(accent, [0, 0, 0])
      ? [255, 255, 255]
      : [0, 0, 0];

  return {
    "--bg": toHex(bg),
    "--surface": toHex(surface),
    "--surface-raised": toHex(surfaceRaised),
    "--line": toHex(line),
    "--line-visible": toHex(lineVisible),
    "--control-line": toHex(controlLine),
    "--ink-strong": toHex(inkStrong),
    "--ink": toHex(ink),
    "--ink-muted": toHex(muted),
    "--ink-faint": toHex(faint),
    "--focus-ring": toHex(focus),
    "--scrim": toRgba(bg, dark ? 0.62 : 0.42),
    "--texture-ink": toRgba(fg, dark ? 0.035 : 0.05),
    "--overlay-surface": toRgba(surface, dark ? 0.82 : 0.86),
    "--selection-bg": toHex(accent),
    "--selection-ink": toHex(selectionInk),
    "--accent": toHex(accent),
    "--accent-2": toHex(accent2),
    "--accent-3": toHex(accent3),
    "--accent-soft": toRgba(accent, dark ? 0.18 : 0.16),
    "--accent-2-soft": toRgba(accent2, dark ? 0.14 : 0.12),
    "--accent-3-soft": toRgba(accent3, dark ? 0.14 : 0.12),
    "--glass-tint-rgb": toRgbChannels(surface),
    "--status-ok": toHex(status.ok),
    "--status-warn": toHex(status.warn),
    "--status-err": toHex(status.err),
    "--status-info": toHex(status.info),
    "--status-ok-subtle": toRgba(status.ok, 0.1),
    "--status-warn-subtle": toRgba(status.warn, 0.1),
    "--status-err-subtle": toRgba(status.err, 0.1),
    "--status-info-subtle": toRgba(status.info, 0.1),
  };
}

export const themeTokenKeys: readonly string[] = [
  "--bg",
  "--surface",
  "--surface-raised",
  "--line",
  "--line-visible",
  "--control-line",
  "--ink-strong",
  "--ink",
  "--ink-muted",
  "--ink-faint",
  "--focus-ring",
  "--scrim",
  "--texture-ink",
  "--overlay-surface",
  "--selection-bg",
  "--selection-ink",
  "--accent",
  "--accent-2",
  "--accent-3",
  "--accent-soft",
  "--accent-2-soft",
  "--accent-3-soft",
  "--glass-tint-rgb",
  "--status-ok",
  "--status-warn",
  "--status-err",
  "--status-info",
  "--status-ok-subtle",
  "--status-warn-subtle",
  "--status-err-subtle",
  "--status-info-subtle",
];

export function applyThemeTokens(tokens: ThemeTokenMap, root: HTMLElement): void {
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
}

export function clearThemeTokens(root: HTMLElement): void {
  for (const key of themeTokenKeys) {
    root.style.removeProperty(key);
  }
}

export interface CachedTheme {
  name: string;
  colors: ThemeColors;
  tokens: ThemeTokenMap;
}

export function cacheTheme(theme: CachedTheme): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.setItem(themeNameStorageKey, theme.name);
  localStorage.setItem(themeTokenCacheKey, JSON.stringify(theme));
}

export function readCachedTheme(): CachedTheme | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(themeTokenCacheKey);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as CachedTheme;
    if (parsed && typeof parsed.name === "string" && parsed.tokens) {
      return parsed;
    }
  } catch {
    return null;
  }
  return null;
}

export function clearCachedTheme(): void {
  if (typeof localStorage === "undefined") {
    return;
  }
  localStorage.removeItem(themeNameStorageKey);
  localStorage.removeItem(themeTokenCacheKey);
}

export function readThemeName(): string | null {
  if (typeof localStorage === "undefined") {
    return null;
  }
  return localStorage.getItem(themeNameStorageKey);
}

export async function fetchRegistry(): Promise<ThemeRegistry> {
  const response = await fetch(THEME_REGISTRY_URL);
  if (!response.ok) {
    throw new Error(`Theme registry request failed (${response.status})`);
  }
  const registry = (await response.json()) as ThemeRegistry;
  if (!Array.isArray(registry.themes)) {
    throw new Error("Theme registry is malformed");
  }
  return registry;
}

export async function fetchTheme(registry: ThemeRegistry, file: string): Promise<ThemeColors> {
  const response = await fetch(themeFileUrl(registry, file));
  if (!response.ok) {
    throw new Error(`Theme download failed (${response.status})`);
  }
  const entry = registry.themes.find((theme) => theme.file === file);
  return parseThemeFile(await response.text(), entry);
}
