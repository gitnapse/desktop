import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Page } from "../Page";
import { Button, StatusLine } from "../../ui";
import * as bridge from "../../lib/bridge";
import { BranchesPanel } from "../../features/local/components/BranchesPanel";
import { ClonePanel } from "../../features/local/components/ClonePanel";
import { CommitPanel } from "../../features/local/components/CommitPanel";
import { DiffPanel } from "../../features/local/components/DiffPanel";
import { LocalHeader } from "../../features/local/components/LocalHeader";
import { LogPanel } from "../../features/local/components/LogPanel";
import { RemotesPanel } from "../../features/local/components/RemotesPanel";
import { StashPanel } from "../../features/local/components/StashPanel";
import { StatusPanel } from "../../features/local/components/StatusPanel";
import { SyncPanel } from "../../features/local/components/SyncPanel";
import { TagsPanel } from "../../features/local/components/TagsPanel";
import { localKeys } from "../../features/local/lib/keys";
import { clearLocalCwd, loadLocalCwd, saveLocalCwd } from "../../features/local/lib/storage";
import type { DiffTarget } from "../../features/local/lib/status";
import { QueryFeedback } from "../../features/repo/components/QueryFeedback";
import "../../features/repo/repo.css";
import "../../features/local/local.css";

export default function LocalPage() {
  const [cwd, setCwd] = useState<string | null>(() => loadLocalCwd());
  const [target, setTarget] = useState<DiffTarget>({ mode: "worktree" });

  const info = useQuery({
    queryKey: localKeys.info(cwd ?? ""),
    queryFn: () => bridge.gitRepoInfo(cwd ?? ""),
    enabled: Boolean(cwd),
  });
  const status = useQuery({
    queryKey: localKeys.status(cwd ?? ""),
    queryFn: () => bridge.gitStatus(cwd ?? ""),
    enabled: Boolean(cwd),
  });

  function openLocal(path: string) {
    saveLocalCwd(path);
    setCwd(path);
    setTarget({ mode: "worktree" });
  }

  function closeLocal() {
    clearLocalCwd();
    setCwd(null);
  }

  return (
    <Page title="Local" label="GitNapse // Working trees">
      {cwd === null ? (
        <ClonePanel onOpen={openLocal} />
      ) : (
        <>
          <QueryFeedback
            pending={info.isPending}
            error={info.isError && info.error instanceof Error ? info.error : null}
            onRetry={() => void info.refetch()}
          />
          {info.isError ? (
            <div className="settings-row">
              <StatusLine kind="warn" message="SELECTED PATH IS NOT A GIT REPOSITORY" />
              <Button variant="technical" onClick={closeLocal}>
                Forget path
              </Button>
            </div>
          ) : null}
          {info.isSuccess ? (
            <>
              <LocalHeader info={info.data} status={status.data ?? null} onClose={closeLocal} />
              <div className="local-grid">
                <div className="local-grid__main">
                  <StatusPanel
                    cwd={cwd}
                    onSelectPath={(path, group) =>
                      setTarget({ mode: group === "staged" ? "staged" : "worktree", path })
                    }
                  />
                  <DiffPanel cwd={cwd} target={target} onTargetChange={setTarget} />
                  <LogPanel
                    cwd={cwd}
                    selectedRev={target.mode === "commit" ? target.rev ?? null : null}
                    onSelectCommit={(rev) => setTarget({ mode: "commit", rev })}
                  />
                </div>
                <aside className="local-grid__side">
                  <CommitPanel cwd={cwd} />
                  <SyncPanel cwd={cwd} branch={status.data?.branch ?? info.data.branch} />
                  <BranchesPanel cwd={cwd} />
                  <TagsPanel cwd={cwd} />
                  <StashPanel cwd={cwd} />
                  <RemotesPanel cwd={cwd} />
                </aside>
              </div>
            </>
          ) : null}
        </>
      )}
    </Page>
  );
}
