import { describe, expect, it } from "vitest";
import { contrast, parseHexColor } from "./contrast";
import {
  buildThemeTokens,
  clearThemeTokens,
  ensureContrast,
  mix,
  parseColor,
  parseThemeFile,
  stripJsonComments,
  toHex,
  toHsl,
  themeTokenKeys,
} from "./themes";

const tokio = `{
    // GitNapse Theme: Tokio
    "theme_name": "Tokio",
    "background": "#1c1c1d",
    "foreground": "#f7f1ff",
    "accent": "#fc618d",
    "accent2": "#7bd88f",
    "accent3": "#5ad4e6",
    "selection_fg": "#000000"
}`;

describe("parseColor", () => {
  it("parses long hex", () => {
    expect(parseColor("#ff8800")).toEqual([255, 136, 0]);
  });

  it("expands short hex", () => {
    expect(parseColor("#f80")).toEqual([255, 136, 0]);
  });

  it("accepts rgb tuples", () => {
    expect(parseColor([12, 34, 56])).toEqual([12, 34, 56]);
  });

  it("rejects invalid values", () => {
    expect(() => parseColor("nope")).toThrow();
    expect(() => parseColor("#12345")).toThrow();
  });
});

describe("toHex", () => {
  it("round-trips with parseColor", () => {
    expect(toHex(parseColor("#5ad4e6"))).toBe("#5ad4e6");
  });
});

describe("mix", () => {
  it("interpolates channels", () => {
    expect(mix([0, 0, 0], [255, 255, 255], 0.5)).toEqual([128, 128, 128]);
  });
});

describe("ensureContrast", () => {
  it("lifts a low-contrast color against a dark backdrop", () => {
    const backdrop = parseHexColor("#1c1c1d");
    const dim = parseHexColor("#3a3a3a");
    expect(contrast(dim, backdrop)).toBeLessThan(3);
    expect(contrast(ensureContrast(dim, backdrop, 4.5), backdrop)).toBeGreaterThanOrEqual(4.5);
  });

  it("darkens against a light backdrop", () => {
    const backdrop = parseHexColor("#f5f2ec");
    const pale = parseHexColor("#ddd9d0");
    expect(contrast(ensureContrast(pale, backdrop, 4.5), backdrop)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps a passing color untouched", () => {
    const backdrop = parseHexColor("#000000");
    const bright = parseHexColor("#ffffff");
    expect(ensureContrast(bright, backdrop, 4.5)).toEqual(bright);
  });
});

describe("stripJsonComments", () => {
  it("removes line comments without touching urls", () => {
    const input = `{ "file": "https://raw.example/colors/X.jsonc", // note\n "n": 1 }`;
    const stripped = stripJsonComments(input);
    expect(stripped).toContain("https://raw.example/colors/X.jsonc");
    expect(stripped).not.toContain("// note");
    expect(() => JSON.parse(stripped)).not.toThrow();
  });

  it("removes block comments", () => {
    const stripped = stripJsonComments(`{ /* c */ "a": 1 }`);
    expect(JSON.parse(stripped)).toEqual({ a: 1 });
  });
});

describe("parseThemeFile", () => {
  it("reads a registry theme and infers its mode", () => {
    const theme = parseThemeFile(tokio, { name: "Tokio", dark: true });
    expect(theme.name).toBe("Tokio");
    expect(theme.dark).toBe(true);
    expect(theme.background).toBe("#1c1c1d");
    expect(theme.foreground).toBe("#f7f1ff");
    expect(theme.accent).toBe("#fc618d");
    expect(theme.selectionFg).toBe("#000000");
  });

  it("infers dark mode from a light background when no entry exists", () => {
    const theme = parseThemeFile(`{ "theme_name":"L", "background":"#ffffff", "foreground":"#111111", "accent":"#0000ff", "accent2":"#00aa00", "accent3":"#cc0000" }`);
    expect(theme.dark).toBe(false);
  });
});

describe("buildThemeTokens", () => {
  const theme = parseThemeFile(tokio, { name: "Tokio", dark: true });
  const tokens = buildThemeTokens(theme);

  it("emits every themeable token", () => {
    for (const key of themeTokenKeys) {
      expect(tokens[key], key).toBeTruthy();
    }
  });

  it("paints the background and foreground", () => {
    expect(tokens["--bg"]).toBe("#1c1c1d");
    expect(tokens["--ink"]).toBe("#f7f1ff");
  });

  it("distributes accents by hue: pink->err, green->ok, cyan->info", () => {
    expect(toHsl(parseColor(tokens["--status-err"] ?? "#000")).h).toBeGreaterThan(300);
    expect(toHsl(parseColor(tokens["--status-ok"] ?? "#000")).h).toBeGreaterThan(60);
    expect(toHsl(parseColor(tokens["--status-info"] ?? "#000")).h).toBeGreaterThan(150);
  });

  it("keeps body and muted ink legible on raised surfaces", () => {
    const raised = parseColor(tokens["--surface-raised"] ?? "#000");
    expect(contrast(parseColor(tokens["--ink"] ?? "#000"), raised)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(parseColor(tokens["--ink-muted"] ?? "#000"), raised)).toBeGreaterThanOrEqual(
      4.5,
    );
  });

  it("keeps status colors legible on raised surfaces", () => {
    const raised = parseColor(tokens["--surface-raised"] ?? "#000");
    for (const role of ["ok", "warn", "err", "info"] as const) {
      const color = parseColor(tokens[`--status-${role}`] ?? "#000");
      expect(contrast(color, raised), role).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("falls back to semantic status when a theme is monochrome", () => {
    const berlin = parseThemeFile(
      `{ "theme_name":"Berlin","background":"#000000","foreground":"#cccccc","accent":"#999999","accent2":"#bbbbbb","accent3":"#cccccc" }`,
      { name: "Berlin", dark: true },
    );
    const monoTokens = buildThemeTokens(berlin);
    expect(toHsl(parseColor(monoTokens["--status-info"] ?? "#000")).s).toBeGreaterThan(0.2);
    expect(toHsl(parseColor(monoTokens["--status-ok"] ?? "#000")).s).toBeGreaterThan(0.2);
  });
});

describe("clearThemeTokens", () => {
  it("removes every themeable custom property", () => {
    const props = new Map<string, string>();
    const root = {
      style: {
        setProperty: (key: string, value: string) => props.set(key, value),
        removeProperty: (key: string) => props.delete(key),
        getPropertyValue: (key: string) => props.get(key) ?? "",
      },
    } as unknown as HTMLElement;
    for (const key of themeTokenKeys) {
      root.style.setProperty(key, "#123456");
    }
    clearThemeTokens(root);
    for (const key of themeTokenKeys) {
      expect(root.style.getPropertyValue(key)).toBe("");
    }
  });
});
