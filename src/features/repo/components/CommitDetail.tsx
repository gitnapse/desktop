import { useQuery } from "@tanstack/react-query";
import * as bridge from "../../../lib/bridge";
import { DiffView } from "./DiffView";
import { EmptyPanel } from "./EmptyPanel";
import { QueryFeedback } from "./QueryFeedback";

export interface CommitDetailProps {
  repo: string;
  base: string | null;
  head: string;
  shortSha: string;
}

export function CommitDetail({ repo, base, head, shortSha }: CommitDetailProps) {
  const compare = useQuery({
    queryKey: ["commit-diff", repo, base, head],
    queryFn: () => bridge.compareBranches(repo, base ?? "", head),
    enabled: Boolean(base),
  });

  return (
    <section className="commitdetail glass-flat" aria-label={`Commit ${shortSha}`}>
      <header className="commitdetail__head">
        <p className="t-label">Commit</p>
        <h3 className="t-data commitdetail__sha">{shortSha}</h3>
      </header>
      {base === null ? (
        <EmptyPanel title="INITIAL COMMIT" hint="No parent commit to diff against." />
      ) : (
        <>
          <QueryFeedback
            pending={compare.isPending}
            error={compare.error}
            onRetry={() => void compare.refetch()}
          />
          {compare.isSuccess ? (
            <DiffView files={compare.data.files} emptyLabel="NO FILE CHANGES" />
          ) : null}
        </>
      )}
    </section>
  );
}
