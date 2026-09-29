import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Button } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import { EmptyPanel } from "../../../features/repo/components/EmptyPanel";
import { QueryFeedback } from "../../../features/repo/components/QueryFeedback";
import { ReleaseCard } from "../../../features/repo/components/ReleaseCard";
import { ReleaseCreateDialog } from "../../../features/repo/components/ReleaseCreateDialog";
import { SectionPanel } from "../../../features/repo/components/SectionPanel";

export default function ReleasesTab() {
  const { owner = "", name = "" } = useParams();
  const fullName = `${owner}/${name}`;
  const [createOpen, setCreateOpen] = useState(false);

  const repo = useQuery({
    queryKey: ["repo", fullName],
    queryFn: () => bridge.repoDetail(fullName),
  });
  const releases = useQuery({
    queryKey: ["releases", fullName],
    queryFn: () => bridge.releases(fullName, 30),
  });

  return (
    <>
      <SectionPanel
        title="Releases"
        label="Tags and notes"
        actions={
          <Button variant="technical" onClick={() => setCreateOpen(true)}>
            New release
          </Button>
        }
      >
        <QueryFeedback
          pending={releases.isPending}
          error={releases.error}
          onRetry={() => void releases.refetch()}
        />
        {releases.isSuccess && releases.data.length === 0 ? (
          <EmptyPanel title="NO RELEASES" hint="Publish a tag to start the release history." />
        ) : null}
        {releases.isSuccess && releases.data.length > 0 ? (
          <div className="releaselist">
            {releases.data.map((release, index) => (
              <ReleaseCard key={release.tag_name} release={release} defaultOpen={index === 0} />
            ))}
          </div>
        ) : null}
      </SectionPanel>
      <ReleaseCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        repo={fullName}
        defaultBranch={repo.data?.default_branch ?? "main"}
      />
    </>
  );
}
