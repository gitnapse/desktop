import type { ContentDto } from "../../../lib/types";

export interface ContentText {
  kind: "text";
  text: string;
  bytes: number;
  lines: number;
}

export interface ContentBinary {
  kind: "binary";
  bytes: number;
}

export interface ContentEmpty {
  kind: "empty";
  bytes: number;
}

export type DecodedContent = ContentText | ContentBinary | ContentEmpty;

export const MAX_RENDER_BYTES = 512 * 1024;

const SAMPLE_BYTES = 8000;
const BINARY_RATIO = 0.15;

export function decodeBase64(source: string): Uint8Array {
  const cleaned = source.replace(/\s+/g, "");
  const binary = atob(cleaned);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export function isProbablyBinary(bytes: Uint8Array): boolean {
  const limit = Math.min(bytes.length, SAMPLE_BYTES);
  if (limit === 0) {
    return false;
  }
  let suspicious = 0;
  for (let index = 0; index < limit; index += 1) {
    const byte = bytes[index] ?? 0;
    if (byte === 0) {
      return true;
    }
    if (byte < 9 || (byte > 13 && byte < 32)) {
      suspicious += 1;
    }
  }
  return suspicious / limit > BINARY_RATIO;
}

export function decodeContent(content: Pick<ContentDto, "content">): DecodedContent {
  let bytes: Uint8Array;
  try {
    bytes = decodeBase64(content.content);
  } catch {
    bytes = new TextEncoder().encode(content.content);
  }

  if (bytes.length === 0) {
    return { kind: "empty", bytes: 0 };
  }
  if (isProbablyBinary(bytes)) {
    return { kind: "binary", bytes: bytes.length };
  }
  const text = new TextDecoder().decode(bytes);
  return { kind: "text", text, bytes: bytes.length, lines: text.split("\n").length };
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);
}
