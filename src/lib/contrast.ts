export type RGB = readonly [number, number, number];
export type RGBA = readonly [number, number, number, number];

function linearize(channel: number): number {
  const value = channel / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function luminance(color: RGB): number {
  const [red, green, blue] = color;
  return 0.2126 * linearize(red) + 0.7152 * linearize(green) + 0.0722 * linearize(blue);
}

export function over(foreground: RGBA, background: RGB): RGB {
  const alpha = foreground[3];
  return [
    Math.round(alpha * foreground[0] + (1 - alpha) * background[0]),
    Math.round(alpha * foreground[1] + (1 - alpha) * background[1]),
    Math.round(alpha * foreground[2] + (1 - alpha) * background[2]),
  ];
}

export function contrast(a: RGB, b: RGB): number {
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((high ?? 0) + 0.05) / ((low ?? 0) + 0.05);
}

export function worstCaseContrast(
  text: RGB,
  tint: RGBA,
  backdrops: readonly RGB[],
): number {
  return Math.min(...backdrops.map((backdrop) => contrast(text, over(tint, backdrop))));
}

export function parseHexColor(hex: string): RGB {
  const value = hex.replace("#", "");
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return [red, green, blue];
}
