import { describe, expect, it } from "vitest";
import {
  defaultAppearance,
  parseAppearance,
  persistAppearance,
  resolveTheme,
  type AppearancePreferences,
} from "./theme";

describe("resolveTheme", () => {
  it("follows the system when the preference is system", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  it("overrides the system when a preference is set", () => {
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });
});

describe("parseAppearance", () => {
  it("falls back to defaults for missing values", () => {
    expect(parseAppearance(() => null)).toEqual(defaultAppearance);
  });

  it("rejects invalid stored values", () => {
    const invalid = parseAppearance((key) =>
      key === "gitnapse.theme" ? "neon" : key === "gitnapse.glass" ? "liquid" : "sometimes",
    );
    expect(invalid).toEqual(defaultAppearance);
  });

  it("accepts valid stored values", () => {
    const values: Record<string, string> = {
      "gitnapse.theme": "light",
      "gitnapse.glass": "thick",
      "gitnapse.transparency": "reduce",
    };
    expect(parseAppearance((key) => values[key] ?? null)).toEqual({
      theme: "light",
      glass: "thick",
      transparency: "reduce",
    });
  });
});

describe("persistAppearance", () => {
  it("writes every appearance key", () => {
    const written: Record<string, string> = {};
    const preferences: AppearancePreferences = {
      theme: "dark",
      glass: "thin",
      transparency: "default",
    };
    persistAppearance(preferences, (key, value) => {
      written[key] = value;
    });
    expect(written).toEqual({
      "gitnapse.theme": "dark",
      "gitnapse.glass": "thin",
      "gitnapse.transparency": "default",
    });
  });
});
