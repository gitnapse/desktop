import { describe, expect, it } from "vitest";
import { contrast, parseHexColor, worstCaseContrast, type RGB } from "./contrast";

const darkCanvas = parseHexColor("000000");
const darkSurface = parseHexColor("111111");
const darkRaised = parseHexColor("1a1a1a");
const darkAuroraPeak: RGB = [38, 30, 48];

const lightCanvas = parseHexColor("f5f2ec");
const lightSurface = parseHexColor("ffffff");
const lightRaised = parseHexColor("efece5");
const lightAuroraPeak: RGB = [206, 217, 229];

const darkInk = parseHexColor("e8e8e8");
const lightInk = parseHexColor("1a1a1a");

const darkTints = {
  thin: [17, 17, 17, 0.16] as const,
  regular: [17, 17, 17, 0.26] as const,
  thick: [17, 17, 17, 0.4] as const,
};

const lightTints = {
  thin: [255, 255, 255, 0.42] as const,
  regular: [255, 255, 255, 0.52] as const,
  thick: [255, 255, 255, 0.64] as const,
};

// The app canvas is now a themed aurora, so the worst-case backdrop behind the
// glass chrome is the brightest aurora blob, not a flat "ink coverage" mix.
const darkBackdrops = [darkCanvas, darkSurface, darkRaised, darkAuroraPeak];
const lightBackdrops = [lightCanvas, lightSurface, lightRaised, lightAuroraPeak];

describe("glass contrast contract", () => {
  it("dark ink clears AA on every dark glass level over the app backdrops", () => {
    expect(worstCaseContrast(darkInk, darkTints.thin, darkBackdrops)).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(darkInk, darkTints.regular, darkBackdrops)).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(darkInk, darkTints.thick, darkBackdrops)).toBeGreaterThanOrEqual(4.5);
  });

  it("light ink clears AA on every light glass level over the app backdrops", () => {
    expect(worstCaseContrast(lightInk, lightTints.thin, lightBackdrops)).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(lightInk, lightTints.regular, lightBackdrops)).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(worstCaseContrast(lightInk, lightTints.thick, lightBackdrops)).toBeGreaterThanOrEqual(4.5);
  });

  it("muted text clears AA on every glass level over the aurora peak", () => {
    expect(worstCaseContrast(parseHexColor("999999"), darkTints.thin, [darkAuroraPeak])).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(parseHexColor("999999"), darkTints.regular, [darkAuroraPeak])).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(parseHexColor("999999"), darkTints.thick, [darkAuroraPeak])).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(parseHexColor("635f58"), lightTints.thin, [lightAuroraPeak])).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(parseHexColor("635f58"), lightTints.regular, [lightAuroraPeak])).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(parseHexColor("635f58"), lightTints.thick, [lightAuroraPeak])).toBeGreaterThanOrEqual(4.5);
  });

  it("flat panel fill keeps body and muted ink at AA", () => {
    const darkFlat = [17, 17, 17, 0.6] as const;
    const lightFlat = [255, 255, 255, 0.68] as const;
    expect(worstCaseContrast(darkInk, darkFlat, darkBackdrops)).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(parseHexColor("999999"), darkFlat, darkBackdrops)).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(lightInk, lightFlat, lightBackdrops)).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(parseHexColor("635f58"), lightFlat, lightBackdrops)).toBeGreaterThanOrEqual(4.5);
  });

  it("control borders clear the 3:1 non-text threshold", () => {
    expect(contrast(parseHexColor("666666"), parseHexColor("111111"))).toBeGreaterThanOrEqual(3);
    expect(contrast(parseHexColor("8a857c"), parseHexColor("ffffff"))).toBeGreaterThanOrEqual(3);
  });

  it("focus rings clear the 3:1 non-text threshold on both canvases", () => {
    expect(contrast(parseHexColor("ffffff"), parseHexColor("000000"))).toBeGreaterThanOrEqual(3);
    expect(contrast(parseHexColor("1a1a1a"), parseHexColor("f5f2ec"))).toBeGreaterThanOrEqual(3);
  });
});
