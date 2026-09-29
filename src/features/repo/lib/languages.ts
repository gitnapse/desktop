import hljs from "highlight.js/lib/core";
import type { LanguageFn } from "highlight.js";

type LanguageLoader = () => Promise<{ default: LanguageFn }>;

const loaders: Record<string, LanguageLoader> = {
  typescript: () => import("highlight.js/lib/languages/typescript"),
  javascript: () => import("highlight.js/lib/languages/javascript"),
  json: () => import("highlight.js/lib/languages/json"),
  rust: () => import("highlight.js/lib/languages/rust"),
  python: () => import("highlight.js/lib/languages/python"),
  go: () => import("highlight.js/lib/languages/go"),
  bash: () => import("highlight.js/lib/languages/bash"),
  markdown: () => import("highlight.js/lib/languages/markdown"),
  css: () => import("highlight.js/lib/languages/css"),
  scss: () => import("highlight.js/lib/languages/scss"),
  xml: () => import("highlight.js/lib/languages/xml"),
  yaml: () => import("highlight.js/lib/languages/yaml"),
  sql: () => import("highlight.js/lib/languages/sql"),
  c: () => import("highlight.js/lib/languages/c"),
  cpp: () => import("highlight.js/lib/languages/cpp"),
  java: () => import("highlight.js/lib/languages/java"),
  kotlin: () => import("highlight.js/lib/languages/kotlin"),
  ruby: () => import("highlight.js/lib/languages/ruby"),
  php: () => import("highlight.js/lib/languages/php"),
  swift: () => import("highlight.js/lib/languages/swift"),
  diff: () => import("highlight.js/lib/languages/diff"),
  ini: () => import("highlight.js/lib/languages/ini"),
  dockerfile: () => import("highlight.js/lib/languages/dockerfile"),
  makefile: () => import("highlight.js/lib/languages/makefile"),
  lua: () => import("highlight.js/lib/languages/lua"),
};

const extensions: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  jsonc: "json",
  rs: "rust",
  py: "python",
  pyw: "python",
  go: "go",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  ksh: "bash",
  md: "markdown",
  markdown: "markdown",
  mdx: "markdown",
  css: "css",
  scss: "scss",
  sass: "scss",
  html: "xml",
  htm: "xml",
  xml: "xml",
  svg: "xml",
  vue: "xml",
  yml: "yaml",
  yaml: "yaml",
  toml: "ini",
  sql: "sql",
  c: "c",
  h: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  hpp: "cpp",
  hh: "cpp",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  rb: "ruby",
  php: "php",
  swift: "swift",
  diff: "diff",
  patch: "diff",
  ini: "ini",
  cfg: "ini",
  conf: "ini",
  lua: "lua",
  mk: "makefile",
};

const specialNames: Record<string, string> = {
  dockerfile: "dockerfile",
  containerfile: "dockerfile",
  makefile: "makefile",
  gnumakefile: "makefile",
  ".gitignore": "bash",
  ".gitattributes": "bash",
  ".env": "bash",
};

const pending = new Map<string, Promise<void>>();

export function languageForPath(path: string): string | null {
  const name = (path.split("/").pop() ?? path).toLowerCase();
  const special = specialNames[name];
  if (special) {
    return special;
  }
  const dot = name.lastIndexOf(".");
  if (dot === -1 || dot === name.length - 1) {
    return null;
  }
  return extensions[name.slice(dot + 1)] ?? null;
}

export async function loadLanguage(id: string): Promise<boolean> {
  if (hljs.getLanguage(id)) {
    return true;
  }
  const loader = loaders[id];
  if (!loader) {
    return false;
  }
  let promise = pending.get(id);
  if (!promise) {
    promise = loader()
      .then((module) => {
        hljs.registerLanguage(id, module.default);
      })
      .catch(() => undefined);
    pending.set(id, promise);
  }
  await promise;
  return hljs.getLanguage(id) !== undefined;
}

export function highlightWith(id: string, code: string): string | null {
  if (!hljs.getLanguage(id)) {
    return null;
  }
  try {
    return hljs.highlight(code, { language: id, ignoreIllegals: true }).value;
  } catch {
    return null;
  }
}

export const supportedLanguages = Object.freeze(Object.keys(loaders));
