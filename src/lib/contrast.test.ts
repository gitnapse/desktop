import { describe, expect, it } from "vitest";
import { contrast, parseHexColor, worstCaseContrast, type RGB } from "./contrast";

const darkCanvas = parseHexColor("000000");
const darkSurface = parseHexColor("111111");
const darkRaised = parseHexColor("1a1a1a");
const darkBusyMix: RGB = [71, 71, 71];

const lightCanvas = parseHexColor("f5f2ec");
const lightSurface = parseHexColor("ffffff");
const lightRaised = parseHexColor("efece5");
const lightBusyMix: RGB = [190, 190, 190];

const darkInk = parseHexColor("e8e8e8");
const lightInk = parseHexColor("1a1a1a");

const darkTints = {
  thin: [17, 17, 17, 0.55] as const,
  regular: [17, 17, 17, 0.66] as const,
  thick: [17, 17, 17, 0.78] as const,
};

const lightTints = {
  thin: [255, 255, 255, 0.62] as const,
  regular: [255, 255, 255, 0.74] as const,
  thick: [255, 255, 255, 0.86] as const,
};

describe("glass contrast contract", () => {
  it("dark ink clears AA on every dark glass level over the app backdrops", () => {
    const backdrops = [darkCanvas, darkSurface, darkRaised, darkBusyMix];
    expect(worstCaseContrast(darkInk, darkTints.thin, backdrops)).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(darkInk, darkTints.regular, backdrops)).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(darkInk, darkTints.thick, backdrops)).toBeGreaterThanOrEqual(4.5);
  });

  it("light ink clears AA on every light glass level over the app backdrops", () => {
    const backdrops = [lightCanvas, lightSurface, lightRaised, lightBusyMix];
    expect(worstCaseContrast(lightInk, lightTints.thin, backdrops)).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(lightInk, lightTints.regular, backdrops)).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(lightInk, lightTints.thick, backdrops)).toBeGreaterThanOrEqual(4.5);
  });

  it("muted text clears AA on every glass level over the busy backdrop", () => {
    expect(worstCaseContrast(parseHexColor("999999"), darkTints.thin, [darkBusyMix])).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(parseHexColor("999999"), darkTints.regular, [darkBusyMix])).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(parseHexColor("999999"), darkTints.thick, [darkBusyMix])).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(parseHexColor("635f58"), lightTints.thin, [lightBusyMix])).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(parseHexColor("635f58"), lightTints.regular, [lightBusyMix])).toBeGreaterThanOrEqual(4.5);
    expect(worstCaseContrast(parseHexColor("635f58"), lightTints.thick, [lightBusyMix])).toBeGreaterThanOrEqual(4.5);
  });

  it("flat card fill keeps body and muted ink at AA", () => {
    const darkFlat = [17, 17, 17, 0.82] as const;
    const lightFlat = [255, 255, 255, 0.82] as const;
    expect(
      worstCaseContrast(darkInk, darkFlat, [darkCanvas, darkSurface, darkRaised, darkBusyMix]),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      worstCaseContrast(parseHexColor("999999"), darkFlat, [
        darkCanvas,
        darkSurface,
        darkRaised,
        darkBusyMix,
      ]),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      worstCaseContrast(lightInk, lightFlat, [lightCanvas, lightSurface, lightRaised, lightBusyMix]),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      worstCaseContrast(parseHexColor("635f58"), lightFlat, [
        lightCanvas,
        lightSurface,
        lightRaised,
        lightBusyMix,
      ]),
    ).toBeGreaterThanOrEqual(4.5);
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
