import { ExternalLink, FileCode2 } from "lucide-react";
import { IconButton } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import type { CodeSearchResultDto } from "../../../lib/types";

export interface CodeResultRowProps {
  result: CodeSearchResultDto;
  onOpenRepo: (repo: string) => void;
}

export function CodeResultRow({ result, onOpenRepo }: CodeResultRowProps) {
  return (
    <li className="datarow datarow--code">
      <button
        type="button"
        className="datarow__grow"
        onClick={() => onOpenRepo(result.repo)}
        aria-label={`Open repository ${result.repo}`}
      >
        <FileCode2 size={16} strokeWidth={1.5} aria-hidden="true" />
        <span className="datarow__main">
          <span className="datarow__title t-data">{result.path}</span>
          <span className="datarow__meta">
            <span className="t-label">{result.repo}</span>
            <span className="datarow__sha">{result.sha.slice(0, 7)}</span>
          </span>
        </span>
      </button>
      <span className="datarow__trailing">
        {result.html_url ? (
          <IconButton
            icon={ExternalLink}
            size="sm"
            label={`Open ${result.name} on GitHub`}
            onClick={() => {
              void bridge.openExternal(result.html_url ?? "");
            }}
          />
        ) : null}
      </span>
    </li>
  );
}
