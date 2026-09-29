import { describe, expect, it } from "vitest";
import { decodeBase64, decodeContent, escapeHtml, isProbablyBinary } from "./content";

function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

describe("decodeBase64", () => {
  it("decodes ascii and utf-8 payloads", () => {
    expect(new TextDecoder().decode(decodeBase64(toBase64("hello")))).toBe("hello");
    expect(new TextDecoder().decode(decodeBase64(toBase64("héllo — ünïcode")))).toBe(
      "héllo — ünïcode",
    );
  });

  it("ignores whitespace and newlines in base64 input", () => {
    const encoded = toBase64("line one\nline two");
    const wrapped = encoded.replace(/(.{4})/g, "$1\n");
    expect(new TextDecoder().decode(decodeBase64(wrapped))).toBe("line one\nline two");
  });
});

describe("isProbablyBinary", () => {
  it("flags null bytes and control-heavy payloads", () => {
    expect(isProbablyBinary(new Uint8Array([104, 105]))).toBe(false);
    expect(isProbablyBinary(new Uint8Array([104, 0, 105]))).toBe(true);
    expect(isProbablyBinary(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toBe(true);
  });
});

describe("decodeContent", () => {
  it("decodes base64 text with line count (protocol ContentDto is base64)", () => {
    const decoded = decodeContent({ content: toBase64("alpha\nbeta\ngamma") });
    expect(decoded.kind).toBe("text");
    if (decoded.kind === "text") {
      expect(decoded.text).toBe("alpha\nbeta\ngamma");
      expect(decoded.lines).toBe(3);
      expect(decoded.bytes).toBe(16);
    }
  });

  it("reports empty and binary payloads", () => {
    expect(decodeContent({ content: "" }).kind).toBe("empty");
    const binary = toBase64("a\u0000b");
    expect(decodeContent({ content: binary }).kind).toBe("binary");
  });

  it("falls back to raw text when base64 is malformed", () => {
    const decoded = decodeContent({ content: "%%%not base64%%%" });
    expect(decoded.kind).toBe("text");
  });
});

describe("escapeHtml", () => {
  it("escapes markup characters", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;",
    );
    expect(escapeHtml("a & b")).toBe("a &amp; b");
  });
});
