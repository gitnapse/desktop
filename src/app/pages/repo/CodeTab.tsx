import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { Check, Copy, Download } from "lucide-react";
import { Button } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import type { TreeNodeDto } from "../../../lib/types";
import { CodeView } from "../../../features/repo/components/CodeView";
import { FileTree } from "../../../features/repo/components/FileTree";
import { mergeRepoQuery, parseRefParam } from "../../../features/repo/lib/query";
import { rawUrl } from "../../../features/repo/lib/urls";
import { useCopy } from "../../../features/repo/lib/useCopy";

const EMPTY_TREE: ReadonlyArray<TreeNodeDto> = [];

export default function CodeTab() {
  const { owner = "", name = "" } = useParams();
  const fullName = `${owner}/${name}`;
  const [params, setParams] = useSearchParams();
  const { copied, copy } = useCopy();

  const repo = useQuery({
    queryKey: ["repo", fullName],
    queryFn: () => bridge.repoDetail(fullName),
  });
  const ref = parseRefParam(params.get("ref")) ?? repo.data?.default_branch ?? null;
  const path = params.get("path");

  const tree = useQuery({
    queryKey: ["repo-tree", fullName, ref],
    queryFn: () => bridge.repoTree(fullName, ref ?? undefined),
  });
  const file = useQuery({
    queryKey: ["file", fullName, ref, path],
    queryFn: () => bridge.fileContent(fullName, path ?? "", ref ?? undefined),
    enabled: Boolean(path),
  });

  return (
    <div className="code-layout">
      <aside className="code-layout__tree">
        <FileTree
          nodes={tree.data ?? EMPTY_TREE}
          selectedPath={path}
          onSelect={(node) => {
            setParams(mergeRepoQuery(params, { path: node.path }));
          }}
          loading={tree.isPending}
          error={tree.error}
          onRetry={() => void tree.refetch()}
        />
      </aside>
      <div className="code-layout__main">
        <div className="code-toolbar">
          <span className="t-label code-toolbar__ref">{`${ref ?? "HEAD"}${path ? ` · ${path}` : ""}`}</span>
          <div className="code-toolbar__actions">
            {path ? (
              <Button
                variant="technical"
                icon={copied ? Check : Copy}
                onClick={() => copy(path)}
              >
                {copied ? "Copied" : "Copy path"}
              </Button>
            ) : null}
            {path && ref ? (
              <Button
                variant="technical"
                icon={Download}
                onClick={() => {
                  void bridge.openExternal(rawUrl(fullName, ref, path));
                }}
              >
                Download
              </Button>
            ) : null}
          </div>
        </div>
        <CodeView
          content={file.data ?? null}
          path={path}
          repoFullName={fullName}
          refName={ref}
          loading={file.isPending && Boolean(path)}
          error={file.error}
          onRetry={() => void file.refetch()}
        />
      </div>
    </div>
  );
}
