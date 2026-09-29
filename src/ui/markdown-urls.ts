export interface MarkdownContext {
  /** `owner/name`; enables relative link/image resolution. */
  repo?: string;
  ref?: string | null;
  /** Path of the markdown file, used as the base for relative URLs. */
  path?: string | null;
}

function directoryOf(path: string | null | undefined): string {
  const value = path ?? "";
  const index = value.lastIndexOf("/");
  return index > 0 ? value.slice(0, index) : "";
}

function resolveRelative(base: string, target: string): string {
  const stack = base.length > 0 ? base.split("/") : [];
  for (const part of target.split("/")) {
    if (part === "" || part === ".") {
      continue;
    }
    if (part === "..") {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return stack.map((segment) => encodeURIComponent(segment)).join("/");
}

/** Resolves a README link/image the way GitHub does (relative to the file). */
export function resolveMarkdownUrl(
  kind: "link" | "img",
  value: string,
  context: MarkdownContext,
): string {
  const url = value.trim();
  if (/^(https?:|mailto:|data:|#|git@|\/\/)/i.test(url) || !context.repo) {
    return url;
  }
  const base = url.startsWith("/") ? "" : directoryOf(context.path);
  const target = url.startsWith("/") ? url.slice(1) : url;
  const resolved = resolveRelative(base, target);
  const ref = context.ref && context.ref.trim().length > 0 ? context.ref.trim() : "HEAD";
  if (kind === "img") {
    return `https://raw.githubusercontent.com/${context.repo}/${encodeURIComponent(ref)}/${resolved}`;
  }
  return `https://github.com/${context.repo}/blob/${encodeURIComponent(ref)}/${resolved}`;
}
