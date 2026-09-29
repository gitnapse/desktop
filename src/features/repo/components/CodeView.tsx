import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Check, Copy, Download, ExternalLink, RefreshCw } from "lucide-react";
import { Button, StatusLine } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import type { ContentDto } from "../../../lib/types";
import { MAX_RENDER_BYTES, decodeContent, escapeHtml } from "../lib/content";
import { highlightWith, languageForPath, loadLanguage } from "../lib/languages";
import { blobUrl, rawUrl } from "../lib/urls";
import { useCopy } from "../lib/useCopy";
import { EmptyPanel } from "./EmptyPanel";

export const MAX_CODE_LINES = 1500;

const SCROLL_LINE = 19;

export interface CodeViewProps {
  content: ContentDto | null;
  path?: string | null;
  repoFullName?: string | null;
  refName?: string | null;
  loading?: boolean;
  error?: Error | null;
  maxBytes?: number;
  maxLines?: number;
  onRetry?: () => void;
}

export function CodeView({
  content,
  path = null,
  repoFullName = null,
  refName = null,
  loading = false,
  error = null,
  maxBytes = MAX_RENDER_BYTES,
  maxLines = MAX_CODE_LINES,
  onRetry,
}: CodeViewProps) {
  const { copied, copy } = useCopy();
  const decoded = useMemo(() => (content ? decodeContent(content) : null), [content]);
  const language = useMemo(() => (path ? languageForPath(path) : null), [path]);
  const [highlighted, setHighlighted] = useState<string | null>(null);

  useEffect(() => {
    setHighlighted(null);
    if (!decoded || decoded.kind !== "text" || !language) {
      return;
    }
    if (decoded.bytes > maxBytes || decoded.lines > maxLines) {
      return;
    }
    let cancelled = false;
    void loadLanguage(language).then((ready) => {
      if (cancelled || !ready || !language) {
        return;
      }
      const value = highlightWith(language, decoded.text);
      if (!cancelled && value !== null) {
        setHighlighted(value);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [decoded, language, maxBytes, maxLines]);

  const renderedLines = useMemo(() => {
    if (!decoded || decoded.kind !== "text") {
      return [];
    }
    return (highlighted ?? escapeHtml(decoded.text)).split("\n");
  }, [decoded, highlighted]);

  const shownLines = renderedLines.slice(0, maxLines);
  const truncated = renderedLines.length > shownLines.length;

  const raw = repoFullName && path ? rawUrl(repoFullName, refName, path) : null;
  const open = repoFullName && path ? blobUrl(repoFullName, refName, path) : raw;

  function scrollKeys(event: KeyboardEvent<HTMLPreElement>) {
    const node = event.currentTarget;
    let delta = 0;
    switch (event.key) {
      case "ArrowDown":
        delta = SCROLL_LINE;
        break;
      case "ArrowUp":
        delta = -SCROLL_LINE;
        break;
      case "PageDown":
        delta = node.clientHeight * 0.9;
        break;
      case "PageUp":
        delta = -node.clientHeight * 0.9;
        break;
      case "Home":
        event.preventDefault();
        node.scrollTop = 0;
        return;
      case "End":
        event.preventDefault();
        node.scrollTop = node.scrollHeight;
        return;
      default:
        return;
    }
    event.preventDefault();
    node.scrollTop += delta;
  }

  if (loading) {
    return <StatusLine kind="loading" />;
  }

  if (error) {
    return (
      <div className="settings-row">
        <StatusLine kind="error" message={error.message} />
        {onRetry ? (
          <Button variant="technical" icon={RefreshCw} onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </div>
    );
  }

  if (!content || !decoded) {
    return <EmptyPanel title="NO FILE SELECTED" hint="Pick a file in the tree to view it." />;
  }

  const actions = (
    <div className="codeview__actions">
      {decoded.kind === "text" ? (
        <Button
          variant="technical"
          icon={copied ? Check : Copy}
          onClick={() => copy(decoded.text)}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      ) : null}
      {raw ? (
        <Button
          variant="technical"
          icon={Download}
          onClick={() => {
            void bridge.openExternal(raw);
          }}
        >
          Raw
        </Button>
      ) : null}
      {open ? (
        <Button
          variant="technical"
          icon={ExternalLink}
          onClick={() => {
            void bridge.openExternal(open);
          }}
        >
          Open
        </Button>
      ) : null}
    </div>
  );

  const header = (
    <header className="codeview__bar">
      <span className="codeview__path">{path ?? content.path}</span>
      {actions}
    </header>
  );

  if (decoded.kind === "binary") {
    return (
      <section className="codeview">
        {header}
        <EmptyPanel title="BINARY FILE" hint="Use Raw to download the file contents." />
      </section>
    );
  }

  if (decoded.kind === "empty") {
    return (
      <section className="codeview">
        {header}
        <EmptyPanel title="EMPTY FILE" />
      </section>
    );
  }

  if (decoded.bytes > maxBytes) {
    return (
      <section className="codeview">
        {header}
        <EmptyPanel
          title="FILE TOO LARGE"
          hint={`${decoded.bytes} bytes exceeds the ${maxBytes} byte render guard. Use Raw to download.`}
        />
      </section>
    );
  }

  return (
    <section className="codeview">
      {header}
      <pre
        className="codeview__pre"
        tabIndex={0}
        role="region"
        aria-label={`${path ?? content.path} content`}
        onKeyDown={scrollKeys}
      >
        <code className="codeview__code">
          {shownLines.map((line, index) => (
            <span className="codeview__line" key={index}>
              <span className="codeview__num" aria-hidden="true">
                {index + 1}
              </span>
              <span className="codeview__text" dangerouslySetInnerHTML={{ __html: line }} />
            </span>
          ))}
        </code>
      </pre>
      <p className="t-label codeview__foot">
        {`${decoded.lines} LINES · ${decoded.bytes} BYTES`}
        {truncated
          ? ` · [TRUNCATED: SHOWING ${shownLines.length} OF ${renderedLines.length}]`
          : ""}
        {language ? ` · ${language.toUpperCase()}` : ""}
      </p>
      {copied ? <StatusLine kind="saved" message="COPIED" /> : null}
    </section>
  );
}
