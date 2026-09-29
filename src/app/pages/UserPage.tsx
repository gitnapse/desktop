import { useQuery } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";
import { Building2, Link2, MapPin, RefreshCw } from "lucide-react";
import { Page } from "../Page";
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  RepoCard,
  Select,
  StatusLine,
  Tabs,
} from "../../ui";
import { EventList } from "../EventList";
import { authQueryKey } from "../auth";
import * as bridge from "../../lib/bridge";
import { externalUrl, repoPath } from "../../lib/format";
import {
  buildUserQuery,
  parseRepoSort,
  parseUserTab,
  repoSortOptions,
  userTabs,
} from "../../lib/search";

export default function UserPage() {
  const { login = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const tab = parseUserTab(params.get("tab"));
  const sort = parseRepoSort(params.get("sort"));

  const auth = useQuery({ queryKey: authQueryKey, queryFn: bridge.authStatus });
  const profile = useQuery({
    queryKey: ["user-profile", login],
    queryFn: () => bridge.userProfile(login),
  });
  const isSelf = auth.data?.has_token === true && auth.data.login === login;

  const repos = useQuery({
    queryKey: ["user-repos", login, sort],
    queryFn: () => bridge.userRepos(login, sort, 1, 100),
  });
  const starred = useQuery({
    queryKey: ["starred-repos", 100],
    queryFn: () => bridge.starredRepos(1, 100),
    enabled: isSelf && tab === "starred",
  });
  const events = useQuery({
    queryKey: ["user-events", login],
    queryFn: () => bridge.userEvents(login, 1, 30),
    enabled: isSelf && tab === "activity",
  });

  const visibleRepos = repos.data ?? [];

  if (profile.isPending) {
    return (
      <Page title={`@${login}`} label="GitNapse // Profile">
        <StatusLine kind="loading" />
      </Page>
    );
  }

  if (profile.isError) {
    return (
      <Page title={`@${login}`} label="GitNapse // Profile">
        <div className="settings-row">
          <StatusLine kind="error" message={profile.error.message} />
          <Button variant="technical" icon={RefreshCw} onClick={() => void profile.refetch()}>
            Retry
          </Button>
        </div>
      </Page>
    );
  }

  const user = profile.data;

  return (
    <Page
      title={user.name ?? `@${user.login}`}
      label="GitNapse // Profile"
      actions={user.name ? <Badge>{`@${user.login}`}</Badge> : undefined}
    >
      <header className="profile glass-flat">
        <Avatar login={user.login} src={user.avatar_url} size="lg" labelled />
        <div className="profile__main">
          <h2 className="t-heading profile__name">{user.name ?? `@${user.login}`}</h2>
          {user.name ? <p className="t-data profile__login">{`@${user.login}`}</p> : null}
          {user.bio ? <p className="t-body-sm profile__bio">{user.bio}</p> : null}
          <ul className="profile__meta">
            {user.company ? (
              <li>
                <Building2 size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>{user.company}</span>
              </li>
            ) : null}
            {user.location ? (
              <li>
                <MapPin size={14} strokeWidth={1.5} aria-hidden="true" />
                <span>{user.location}</span>
              </li>
            ) : null}
            {user.blog ? (
              <li>
                <Link2 size={14} strokeWidth={1.5} aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => void bridge.openExternal(externalUrl(user.blog ?? ""))}
                >
                  {user.blog}
                </button>
              </li>
            ) : null}
          </ul>
        </div>
        <dl className="profile__stats">
          <div>
            <dt className="t-label">Followers</dt>
            <dd className="t-data">{user.followers}</dd>
          </div>
          <div>
            <dt className="t-label">Following</dt>
            <dd className="t-data">{user.following}</dd>
          </div>
          <div>
            <dt className="t-label">Public repos</dt>
            <dd className="t-data">{user.public_repos}</dd>
          </div>
        </dl>
      </header>

      {isSelf ? (
        <Tabs
          ariaLabel="Profile sections"
          value={tab}
          items={userTabs}
          onChange={(value) => {
            setParams(buildUserQuery({ tab: parseUserTab(value), sort }));
          }}
        />
      ) : null}

      {tab === "repos" || !isSelf ? (
        <>
          <div className="searchfilters">
            <div className="searchfilters__select">
              <Select
                label="Sort"
                value={sort}
                options={repoSortOptions.map((option) => ({
                  value: option.value,
                  label: option.label,
                }))}
                onChange={(event) =>
                  setParams(
                    buildUserQuery({
                      tab: "repos",
                      sort: parseRepoSort(event.target.value),
                    }),
                  )
                }
              />
            </div>
            <span className="t-label searchfilters__count">{`${visibleRepos.length} REPOSITOR${visibleRepos.length === 1 ? "Y" : "IES"}`}</span>
          </div>
          {repos.isPending ? <StatusLine kind="loading" /> : null}
          {repos.isError ? (
            <div className="settings-row">
              <StatusLine kind="error" message={repos.error.message} />
              <Button variant="technical" icon={RefreshCw} onClick={() => void repos.refetch()}>
                Retry
              </Button>
            </div>
          ) : null}
          {repos.isSuccess && visibleRepos.length === 0 ? (
            <EmptyState title="NO PUBLIC REPOSITORIES" hint="This profile has no public repositories." />
          ) : null}
          {repos.isSuccess && visibleRepos.length > 0 ? (
            <div className="cardgrid">
              {visibleRepos.map((repo) => (
                <RepoCard key={repo.full_name} repo={repo} to={repoPath(repo)} />
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {isSelf && tab === "starred" ? (
        <>
          {starred.isPending ? <StatusLine kind="loading" /> : null}
          {starred.isError ? (
            <div className="settings-row">
              <StatusLine kind="error" message={starred.error.message} />
              <Button variant="technical" icon={RefreshCw} onClick={() => void starred.refetch()}>
                Retry
              </Button>
            </div>
          ) : null}
          {starred.isSuccess && starred.data.length === 0 ? (
            <EmptyState title="NO STARRED REPOSITORIES" hint="Star projects to collect them here." />
          ) : null}
          {starred.isSuccess && starred.data.length > 0 ? (
            <div className="cardgrid">
              {starred.data.map((repo) => (
                <RepoCard key={repo.full_name} repo={repo} to={repoPath(repo)} />
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {isSelf && tab === "activity" ? (
        <>
          {events.isPending ? <StatusLine kind="loading" /> : null}
          {events.isError ? (
            <div className="settings-row">
              <StatusLine kind="error" message={events.error.message} />
              <Button variant="technical" icon={RefreshCw} onClick={() => void events.refetch()}>
                Retry
              </Button>
            </div>
          ) : null}
          {events.isSuccess && events.data.length === 0 ? (
            <EmptyState title="NO RECENT ACTIVITY" hint="Events appear here as you push and review." />
          ) : null}
          {events.isSuccess && events.data.length > 0 ? (
            <EventList events={events.data} label={`Activity for @${login}`} />
          ) : null}
        </>
      ) : null}
    </Page>
  );
}
