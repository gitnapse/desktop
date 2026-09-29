import { marked } from "marked";
import DOMPurify from "dompurify";

const escapeMap: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (character) => escapeMap[character] ?? character);
}

marked.use({
  gfm: true,
  breaks: false,
  renderer: {
    html(token) {
      return escapeHtml(token.text);
    },
  },
});

const sanitizeConfig = {
  USE_PROFILES: { html: true },
  FORBID_TAGS: ["img", "iframe", "form", "input", "button", "video", "audio", "source", "style"],
  FORBID_ATTR: ["style"],
  ALLOW_DATA_ATTR: false,
};

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node instanceof Element && node.tagName === "A") {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

export function renderMarkdown(source: string): string {
  const html = marked.parse(source, { async: false });
  return DOMPurify.sanitize(html, sanitizeConfig);
}
