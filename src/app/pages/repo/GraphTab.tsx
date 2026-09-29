import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import * as bridge from "../../../lib/bridge";
import type { TreeNodeDto } from "../../../lib/types";
import { RepoGraph } from "../../../features/repo/components/RepoGraph";
import { buildRepoQuery, parseRefParam } from "../../../features/repo/lib/query";

const EMPTY_TREE: ReadonlyArray<TreeNodeDto> = [];

export default function GraphTab() {
  const { owner = "", name = "" } = useParams();
  const fullName = `${owner}/${name}`;
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const repo = useQuery({
    queryKey: ["repo", fullName],
    queryFn: () => bridge.repoDetail(fullName),
  });
  const ref = parseRefParam(params.get("ref")) ?? repo.data?.default_branch ?? null;

  const tree = useQuery({
    queryKey: ["repo-tree", fullName, ref],
    queryFn: () => bridge.repoTree(fullName, ref ?? undefined),
  });

  return (
    <RepoGraph
      tree={tree.data ?? EMPTY_TREE}
      loading={tree.isPending}
      error={tree.error}
      onRetry={() => void tree.refetch()}
      repo={fullName}
      onOpenFile={(path) => {
        navigate(`/repos/${fullName}/code${buildRepoQuery({ ref, path })}`);
      }}
    />
  );
}
