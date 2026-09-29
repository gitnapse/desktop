import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Outlet, useMatch, useParams, useSearchParams } from "react-router-dom";
import { ExternalLink, FolderGit2 } from "lucide-react";
import { Page } from "../Page";
import { Button, StatusLine, Tabs } from "../../ui";
import * as bridge from "../../lib/bridge";
import { CloneRepoDialog } from "../../features/repo/components/CloneRepoDialog";
import { RepoHeader } from "../../features/repo/components/RepoHeader";
import { mergeRepoQuery, refOnlySearch } from "../../features/repo/lib/query";
import "../../features/repo/repo.css";

const repoTabs = [
  { value: "overview", label: "Overview" },
  { value: "code", label: "Code" },
  { value: "commits", label: "Commits" },
  { value: "branches", label: "Branches" },
  { value: "compare", label: "Compare" },
  { value: "issues", label: "Issues" },
  { value: "pulls", label: "Pulls" },
  { value: "actions", label: "Actions" },
  { value: "releases", label: "Releases" },
] as const;

export default function RepoPage() {
  const { owner = "", name = "" } = useParams();
  const fullName = `${owner}/${name}`;
  const match = useMatch("/repos/:owner/:name/:tab");
  const activeTab = match?.params["tab"] ?? "overview";
  const [params, setParams] = useSearchParams();
  const [cloneOpen, setCloneOpen] = useState(false);
  const refName = params.get("ref");
  const search = refOnlySearch(params);

  const repo = useQuery({
    queryKey: ["repo", fullName],
    queryFn: () => bridge.repoDetail(fullName),
  });

  return (
    <Page
      title={fullName}
      label="Repository"
      actions={
        repo.isSuccess ? (
          <>
            <Button
              variant="technical"
              icon={ExternalLink}
              onClick={() => {
                void bridge.openExternal(repo.data.html_url ?? `https://github.com/${fullName}`);
              }}
            >
              Open on GitHub
            </Button>
            <Button icon={FolderGit2} onClick={() => setCloneOpen(true)}>
              Clone
            </Button>
          </>
        ) : undefined
      }
    >
      {repo.isPending ? <StatusLine kind="loading" /> : null}
      {repo.isError ? <StatusLine kind="error" message={repo.error.message} /> : null}
      {repo.isSuccess ? (
        <RepoHeader
          repo={repo.data}
          fullName={fullName}
          refName={refName}
          onRefChange={(nextRef) => {
            setParams(mergeRepoQuery(params, { ref: nextRef, path: null }));
          }}
        />
      ) : null}
      <Tabs
        ariaLabel="Repository sections"
        value={activeTab}
        items={repoTabs.map((tab) => ({
          value: tab.value,
          label: tab.label,
          to: `${tab.value}${search}`,
        }))}
        onChange={() => undefined}
      />
      <Outlet />
      {repo.isSuccess ? (
        <CloneRepoDialog open={cloneOpen} onClose={() => setCloneOpen(false)} spec={fullName} />
      ) : null}
    </Page>
  );
}
