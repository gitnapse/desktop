import { describe, expect, it } from "vitest";
import { resolveMarkdownUrl } from "./markdown-urls";

const context = { repo: "gitnapse/desktop", ref: "main", path: "README.md" };
const nested = { repo: "gitnapse/desktop", ref: "main", path: "docs/guide.md" };

describe("resolveMarkdownUrl", () => {
  it("leaves absolute and special URLs untouched", () => {
    expect(resolveMarkdownUrl("link", "https://example.com", context)).toBe("https://example.com");
    expect(resolveMarkdownUrl("link", "#section", context)).toBe("#section");
    expect(resolveMarkdownUrl("link", "mailto:a@b.c", context)).toBe("mailto:a@b.c");
  });

  it("resolves repo-relative links to blob URLs", () => {
    expect(resolveMarkdownUrl("link", "src/main.rs", context)).toBe(
      "https://github.com/gitnapse/desktop/blob/main/src/main.rs",
    );
  });

  it("resolves repo-relative images to raw URLs", () => {
    expect(resolveMarkdownUrl("img", "assets/logo.png", context)).toBe(
      "https://raw.githubusercontent.com/gitnapse/desktop/main/assets/logo.png",
    );
  });

  it("resolves relative to the file directory", () => {
    expect(resolveMarkdownUrl("link", "./intro.md", nested)).toBe(
      "https://github.com/gitnapse/desktop/blob/main/docs/intro.md",
    );
    expect(resolveMarkdownUrl("link", "../README.md", nested)).toBe(
      "https://github.com/gitnapse/desktop/blob/main/README.md",
    );
  });

  it("treats leading slashes as repo-root paths", () => {
    expect(resolveMarkdownUrl("link", "/src/lib.rs", nested)).toBe(
      "https://github.com/gitnapse/desktop/blob/main/src/lib.rs",
    );
  });

  it("falls back to HEAD when no ref is given", () => {
    expect(resolveMarkdownUrl("img", "logo.png", { repo: "o/r" })).toBe(
      "https://raw.githubusercontent.com/o/r/HEAD/logo.png",
    );
  });

  it("leaves URLs alone without a repo context", () => {
    expect(resolveMarkdownUrl("link", "src/main.rs", {})).toBe("src/main.rs");
  });
});
