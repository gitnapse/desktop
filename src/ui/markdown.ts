import { marked } from "marked";
import DOMPurify from "dompurify";
import { resolveMarkdownUrl, type MarkdownContext } from "./markdown-urls";

export type { MarkdownContext } from "./markdown-urls";

marked.use({ gfm: true, breaks: false });

// GitHub-like allowlist: structural HTML renders, active content does not.
const ALLOWED_TAGS = [
  "a", "p", "br", "hr", "strong", "b", "em", "i", "del", "s", "ins", "sub", "sup", "mark",
  "small", "abbr", "blockquote", "pre", "code", "kbd", "samp", "var",
  "ul", "ol", "li", "dl", "dt", "dd",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "img", "figure", "figcaption", "details", "summary", "div", "span",
  "input",
];

const ALLOWED_ATTR = [
  "href", "src", "alt", "title", "width", "height", "align", "colspan", "rowspan", "open",
  "start", "id", "name", "target", "rel", "loading", "dir", "lang",
  "type", "checked", "disabled",
];

const sanitizeConfig = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  FORBID_TAGS: [
    "script", "style", "iframe", "object", "embed", "form", "button", "textarea",
    "select", "option", "link", "meta", "base", "svg", "math", "video", "audio", "source",
    "track",
  ],
  FORBID_ATTR: ["style"],
  ALLOW_DATA_ATTR: false,
  ADD_DATA_URI_TAGS: ["img"],
};

DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node instanceof Element && node.tagName === "A") {
    node.setAttribute("rel", "noopener noreferrer");
  }
});

function rewriteUrls(html: string, context: MarkdownContext): string {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  for (const image of parsed.querySelectorAll("img")) {
    const src = image.getAttribute("src");
    if (src) {
      image.setAttribute("src", resolveMarkdownUrl("img", src, context));
    }
    image.removeAttribute("srcset");
    image.setAttribute("loading", "lazy");
    image.setAttribute("decoding", "async");
  }
  for (const anchor of parsed.querySelectorAll("a")) {
    const href = anchor.getAttribute("href");
    if (href) {
      anchor.setAttribute("href", resolveMarkdownUrl("link", href, context));
    }
  }
  return parsed.body.innerHTML;
}

export function renderMarkdown(source: string, context?: MarkdownContext): string {
  const html = marked.parse(source, { async: false });
  const clean = DOMPurify.sanitize(html, sanitizeConfig);
  return context?.repo ? rewriteUrls(clean, context) : clean;
}
