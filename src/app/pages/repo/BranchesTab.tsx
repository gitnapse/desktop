import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Check, Copy, GitBranch, GitCompare } from "lucide-react";
import { Badge, Button, IconButton } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import { BranchCreateDialog } from "../../../features/repo/components/BranchCreateDialog";
import { QueryFeedback } from "../../../features/repo/components/QueryFeedback";
import { SectionPanel } from "../../../features/repo/components/SectionPanel";
import { buildRepoQuery } from "../../../features/repo/lib/query";
import { useCopy } from "../../../features/repo/lib/useCopy";

interface BranchRowProps {
  name: string;
  isDefault: boolean;
  compareTo: string;
}

function BranchRow({ name, isDefault, compareTo }: BranchRowProps) {
  const { copied, copy } = useCopy();
  return (
    <li className="datarow">
      <div className="datarow__grow">
        <GitBranch size={16} strokeWidth={1.5} aria-hidden="true" />
        <span className="datarow__main">
          <code className="datarow__branch">{name}</code>
        </span>
        {isDefault ? <Badge>Default</Badge> : null}
      </div>
      <span className="datarow__trailing">
        <IconButton
          icon={copied ? Check : Copy}
          size="sm"
          label={copied ? `Branch ${name} copied` : `Copy branch name ${name}`}
          onClick={() => copy(name)}
        />
        <Link
          className="iconbtn iconbtn--sm"
          aria-label={`Compare default branch with ${name}`}
          to={`compare${buildRepoQuery({ base: compareTo, head: name })}`}
        >
          <GitCompare size={14} strokeWidth={1.5} aria-hidden="true" />
        </Link>
      </span>
    </li>
  );
}

export default function BranchesTab() {
  const { owner = "", name = "" } = useParams();
  const fullName = `${owner}/${name}`;
  const [createOpen, setCreateOpen] = useState(false);

  const repo = useQuery({
    queryKey: ["repo", fullName],
    queryFn: () => bridge.repoDetail(fullName),
  });
  const branches = useQuery({
    queryKey: ["repo-branches", fullName],
    queryFn: () => bridge.branches(fullName),
  });

  const defaultBranch = repo.data?.default_branch ?? "main";

  return (
    <>
      <SectionPanel
        title="Branches"
        label={`${branches.data?.length ?? 0} refs`}
        actions={
          <Button variant="technical" onClick={() => setCreateOpen(true)}>
            New branch
          </Button>
        }
      >
        <QueryFeedback
          pending={branches.isPending}
          error={branches.error}
          onRetry={() => void branches.refetch()}
        />
        {branches.isSuccess && branches.data.length === 0 ? (
          <p className="t-label">[NO BRANCHES]</p>
        ) : null}
        {branches.isSuccess && branches.data.length > 0 ? (
          <ul className="rows">
            {branches.data.map((branch) => (
              <BranchRow
                key={branch}
                name={branch}
                isDefault={branch === defaultBranch}
                compareTo={defaultBranch}
              />
            ))}
          </ul>
        ) : null}
      </SectionPanel>
      <BranchCreateDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        repo={fullName}
        defaultBranch={defaultBranch}
        branches={branches.data ?? []}
      />
    </>
  );
}
