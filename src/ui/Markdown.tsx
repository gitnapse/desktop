import { useEffect, useState, type MouseEvent } from "react";
import { openExternal } from "../lib/bridge";

type MarkdownRenderer = (source: string) => string;

let rendererPromise: Promise<MarkdownRenderer> | null = null;

function loadRenderer(): Promise<MarkdownRenderer> {
  rendererPromise ??= import("./markdown").then((module) => module.renderMarkdown);
  return rendererPromise;
}

export interface MarkdownProps {
  source: string;
  className?: string;
}

export function Markdown({ source, className }: MarkdownProps) {
  const [html, setHtml] = useState("");
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadRenderer()
      .then((render) => {
        if (!cancelled) {
          setHtml(render(source));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [source]);

  if (error) {
    return <p className="statusline">{`[ERROR: MARKDOWN RENDERER]`}</p>;
  }

  function onClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target instanceof Element ? event.target : null;
    const anchor = target?.closest("a[href]");
    if (!anchor) {
      return;
    }
    const href = anchor.getAttribute("href") ?? "";
    if (!/^https?:\/\//i.test(href)) {
      return;
    }
    event.preventDefault();
    void openExternal(href);
  }

  return (
    <div
      className={["markdown", className].filter(Boolean).join(" ")}
      aria-busy={html.length === 0}
      onClick={onClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
