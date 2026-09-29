import { useQuery } from "@tanstack/react-query";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Avatar, Markdown } from "../../../ui";
import * as bridge from "../../../lib/bridge";
import type { ContentDto } from "../../../lib/types";
import { commitToRow } from "../../../features/repo/lib/commit";
import { decodeContent } from "../../../features/repo/lib/content";
import { parseRefParam } from "../../../features/repo/lib/query";
import { CommitRow } from "../../../features/repo/components/CommitRow";
import { EmptyPanel } from "../../../features/repo/components/EmptyPanel";
import { QueryFeedback } from "../../../features/repo/components/QueryFeedback";
import { ReleaseCard } from "../../../features/repo/components/ReleaseCard";
import { SectionPanel } from "../../../features/repo/components/SectionPanel";

const README_CANDIDATES = ["README.md", "readme.md", "README.markdown", "README.txt", "README"];

interface ReadmeResult {
  path: string;
  content: ContentDto;
  text: string;
}

async function loadReadme(repo: string, ref: string | null): Promise<ReadmeResult | null> {
  for (const candidate of README_CANDIDATES) {
    try {
      const content = await bridge.fileContent(repo, candidate, ref ?? undefined);
      const decoded = decodeContent(content);
      if (decoded.kind === "text") {
        return { path: candidate, content, text: decoded.text };
      }
    } catch {
      continue;
    }
  }
  return null;
}

export default function OverviewTab() {
  const { owner = "", name = "" } = useParams();
  const fullName = `${owner}/${name}`;
  const [params] = useSearchParams();
  const ref = parseRefParam(params.get("ref"));

  const repo = useQuery({
    queryKey: ["repo", fullName],
    queryFn: () => bridge.repoDetail(fullName),
  });
  const readme = useQuery({
    queryKey: ["repo-readme", fullName, ref],
    queryFn: () => loadReadme(fullName, ref),
  });
  const languages = useQuery({
    queryKey: ["repo-languages", fullName],
    queryFn: () => bridge.repoLanguages(fullName),
  });
  const contributors = useQuery({
    queryKey: ["repo-contributors", fullName],
    queryFn: () => bridge.repoContributors(fullName),
  });
  const commits = useQuery({
    queryKey: ["repo-commits", fullName, ref, 5],
    queryFn: () => bridge.recentCommits(fullName, ref ?? undefined, 5),
  });
  const releases = useQuery({
    queryKey: ["releases", fullName, 1],
    queryFn: () => bridge.releases(fullName, 1),
  });

  const languageEntries = (languages.data ?? [])
    .map((entry) => [entry.name, entry.bytes] as const)
    .sort((a, b) => b[1] - a[1]);
  const languageTotal = languageEntries.reduce((sum, [, bytes]) => sum + bytes, 0);
  const latestRelease = releases.data?.[0];
  const commitsSearch = ref ? `?ref=${encodeURIComponent(ref)}` : "";

  return (
    <div className="repo-overview">
      <div className="repo-overview__main">
        <SectionPanel title="Readme" label="Documentation">
          <QueryFeedback
            pending={readme.isPending}
            error={readme.error}
            onRetry={() => void readme.refetch()}
          />
          {readme.isSuccess && readme.data === null ? (
            <EmptyPanel title="NO README" hint="This repository has no readme on the selected ref." />
          ) : null}
          {readme.isSuccess && readme.data ? (
            <>
              <span className="t-label repo-overview__readme-path">{readme.data.path}</span>
              <Markdown source={readme.data.text} />
            </>
          ) : null}
        </SectionPanel>

        <SectionPanel
          title="Latest commits"
          label="History"
          actions={
            <Link className="t-label repo-overview__link" to={`commits${commitsSearch}`}>
              All commits
            </Link>
          }
        >
          <QueryFeedback
            pending={commits.isPending}
            error={commits.error}
            onRetry={() => void commits.refetch()}
          />
          {commits.isSuccess && commits.data.length === 0 ? (
            <p className="t-label">[NO COMMITS]</p>
          ) : null}
          {commits.isSuccess && commits.data.length > 0 ? (
            <ul className="rows">
              {commits.data.map((commit) => (
                <CommitRow
                  key={commit.sha}
                  commit={commitToRow(commit)}
                  avatar
                  compact
                  repoFullName={fullName}
                  compareFrom={ref ?? repo.data?.default_branch ?? null}
                />
              ))}
            </ul>
          ) : null}
        </SectionPanel>
      </div>

      <aside className="repo-overview__side">
        <SectionPanel title="Languages" label="Composition">
          <QueryFeedback
            pending={languages.isPending}
            error={languages.error}
            onRetry={() => void languages.refetch()}
          />
          {languages.isSuccess && languageEntries.length === 0 ? (
            <p className="t-label">[NO LANGUAGE DATA]</p>
          ) : null}
          {languageEntries.length > 0 && languageTotal > 0 ? (
            <div className="langbar">
              <div
                className="langbar__track"
                role="img"
                aria-label={`Language composition: ${languageEntries
                  .map(
                    ([language, bytes]) =>
                      `${language} ${Math.round((bytes / languageTotal) * 100)}%`,
                  )
                  .join(", ")}`}
              >
                {languageEntries.map(([language, bytes], index) => (
                  <span
                    key={language}
                    className="langbar__seg"
                    data-rank={index % 4}
                    style={{ inlineSize: `${(bytes / languageTotal) * 100}%` }}
                  />
                ))}
              </div>
              <ul className="langbar__legend">
                {languageEntries.map(([language, bytes]) => (
                  <li key={language} className="langbar__item">
                    <span
                      className="langdot"
                      data-lang={language.toLowerCase()}
                      aria-hidden="true"
                    />
                    <span className="t-data langbar__name">{language}</span>
                    <span className="t-label langbar__percent">
                      {`${((bytes / languageTotal) * 100).toFixed(1)}%`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </SectionPanel>

        <SectionPanel title="Contributors" label="People">
          <QueryFeedback
            pending={contributors.isPending}
            error={contributors.error}
            onRetry={() => void contributors.refetch()}
          />
          {contributors.isSuccess && contributors.data.length === 0 ? (
            <p className="t-label">[NO CONTRIBUTORS]</p>
          ) : null}
          {contributors.isSuccess && contributors.data.length > 0 ? (
            <ul className="contriblist">
              {contributors.data.slice(0, 8).map((contributor) => (
                <li key={contributor.login} className="contriblist__item">
                  <Avatar login={contributor.login} src={contributor.avatar_url} size="sm" />
                  <Link className="t-data contriblist__login" to={`/users/${contributor.login}`}>
                    {contributor.login}
                  </Link>
                  <span className="t-label contriblist__count">
                    {`${contributor.contributions} commits`}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </SectionPanel>

        <SectionPanel title="Latest release" label="Releases">
          <QueryFeedback
            pending={releases.isPending}
            error={releases.error}
            onRetry={() => void releases.refetch()}
          />
          {releases.isSuccess && !latestRelease ? <EmptyPanel title="NO RELEASES" /> : null}
          {latestRelease ? <ReleaseCard release={latestRelease} /> : null}
        </SectionPanel>
      </aside>
    </div>
  );
}
