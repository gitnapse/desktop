import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FolderGit2, Plus, RefreshCw, Search } from "lucide-react";
import { Page } from "../Page";
import {
  Avatar,
  Button,
  Checkbox,
  EmptyState,
  Input,
  Modal,
  Panel,
  RepoCard,
  StatTile,
  StatusLine,
} from "../../ui";
import { AuthFlow } from "../AuthFlow";
import { CloneDialog } from "../CloneDialog";
import { EventList } from "../EventList";
import { authQueryKey } from "../auth";
import * as bridge from "../../lib/bridge";
import { authSourceLabel, formatRelativeTime, repoPath } from "../../lib/format";

function NewRepoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const create = useMutation({
    mutationFn: () => bridge.createRepo(name.trim(), description.trim() || undefined, isPrivate),
    onSuccess: (repo) => {
      void queryClient.invalidateQueries({ queryKey: ["user-repos"] });
      void queryClient.invalidateQueries({ queryKey: ["starred-repos"] });
      void queryClient.invalidateQueries({ queryKey: ["search-repos"] });
      onClose();
      navigate(repoPath(repo));
    },
  });

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setIsPrivate(false);
      create.reset();
    }
  }, [open]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (name.trim().length > 0) {
      create.mutate();
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New repository"
      footer={
        <>
          <Button variant="technical" onClick={onClose}>
            Close
          </Button>
          <Button
            type="submit"
            form="new-repo-form"
            primary
            disabled={name.trim().length === 0 || create.isPending}
          >
            Create
          </Button>
        </>
      }
    >
      <form id="new-repo-form" className="settings-stack" onSubmit={submit}>
        <Input
          label="Name"
          mono
          autoFocus
          spellCheck={false}
          placeholder="my-project"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <Input
          label="Description"
          placeholder="Optional"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
        <Checkbox
          label="Private"
          checked={isPrivate}
          onChange={(event) => setIsPrivate(event.target.checked)}
        />
        {create.isPending ? <StatusLine kind="loading" /> : null}
        {create.isError ? <StatusLine kind="error" message={create.error.message} /> : null}
        {create.isSuccess ? <StatusLine kind="saved" message={create.data.full_name} /> : null}
      </form>
    </Modal>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const [newRepoOpen, setNewRepoOpen] = useState(false);
  const [cloneOpen, setCloneOpen] = useState(false);
  const auth = useQuery({ queryKey: authQueryKey, queryFn: bridge.authStatus });
  const user = useQuery({ queryKey: ["api-user"], queryFn: bridge.apiUser });
  const login = user.data?.login;
  const profile = useQuery({
    queryKey: ["user-profile", login],
    queryFn: () => bridge.userProfile(login ?? ""),
    enabled: Boolean(login),
  });
  const starred = useQuery({
    queryKey: ["starred-repos", 30],
    queryFn: () => bridge.starredRepos(1, 30),
  });
  const rate = useQuery({ queryKey: ["rate-limit"], queryFn: bridge.rateLimit });
  const events = useQuery({
    queryKey: ["user-events", login],
    queryFn: () => bridge.userEvents(login ?? "", 1, 30),
    enabled: Boolean(login),
  });

  const statsLoading = user.isPending || profile.isPending || starred.isPending || rate.isPending;
  const statsError = user.error ?? profile.error ?? starred.error ?? rate.error;
  const identity = profile.data;

  function retryStats() {
    void user.refetch();
    void profile.refetch();
    void starred.refetch();
    void rate.refetch();
  }

  return (
    <Page title="Dashboard" label="GitNapse // Home">
      <header className="identity">
        {identity ? (
          <>
            <Avatar login={identity.login} src={identity.avatar_url} size="lg" labelled />
            <div className="identity__text">
              <h2 className="t-heading identity__name">
                {identity.name ?? `@${identity.login}`}
              </h2>
              <p className="t-label identity__login">
                {`@${identity.login} · ${authSourceLabel(auth.data?.source)}`}
              </p>
            </div>
          </>
        ) : (
          <div className="identity__text">
            <h2 className="t-heading identity__name">{login ? `@${login}` : "Signed in"}</h2>
          </div>
        )}
      </header>

      {statsLoading ? <StatusLine kind="loading" /> : null}
      {statsError ? (
        <div className="settings-row">
          <StatusLine kind="error" message={statsError.message} />
          <Button variant="technical" icon={RefreshCw} onClick={retryStats}>
            Retry
          </Button>
        </div>
      ) : null}

      <div className="statgrid">
        <StatTile
          label="Public repos"
          value={identity ? String(identity.public_repos) : "—"}
          hint="Owned on github.com"
        />
        <StatTile
          label="Starred"
          value={starred.isSuccess ? String(starred.data.length) : "—"}
          hint="Loaded from your stars"
        />
        <StatTile
          label="Rate limit left"
          value={rate.isSuccess ? String(rate.data.remaining ?? "—") : "—"}
          delta={
            rate.isSuccess && rate.data.reset !== null
              ? { label: `RESETS ${formatRelativeTime(new Date(rate.data.reset * 1000))}` }
              : undefined
          }
          hint="GitHub REST quota"
        />
      </div>

      <nav className="quickbar" aria-label="Quick actions">
        <Button icon={Plus} onClick={() => setNewRepoOpen(true)}>
          New repository
        </Button>
        <Button icon={FolderGit2} onClick={() => setCloneOpen(true)}>
          Clone repository
        </Button>
        <Button icon={Search} onClick={() => navigate("/search")}>
          Search GitHub
        </Button>
      </nav>

      <section className="section glass-flat" aria-labelledby="home-starred">
        <header className="section__head">
          <p className="t-label section__label">Stars</p>
          <h2 id="home-starred" className="section__title">
            Starred repositories
          </h2>
        </header>
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
          <EmptyState
            title="NO STARRED REPOSITORIES"
            hint="Star projects on GitHub to collect them on this dashboard."
          />
        ) : null}
        {starred.isSuccess && starred.data.length > 0 ? (
          <div className="cardgrid">
            {starred.data.map((repo) => (
              <RepoCard key={repo.full_name} repo={repo} to={repoPath(repo)} />
            ))}
          </div>
        ) : null}
      </section>

      <section className="section glass-flat" aria-labelledby="home-activity">
        <header className="section__head">
          <p className="t-label section__label">Events</p>
          <h2 id="home-activity" className="section__title">
            Recent activity
          </h2>
        </header>
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
        {events.isSuccess && events.data.length > 0 ? <EventList events={events.data} /> : null}
      </section>

      <NewRepoDialog open={newRepoOpen} onClose={() => setNewRepoOpen(false)} />
      <CloneDialog open={cloneOpen} onClose={() => setCloneOpen(false)} />
    </Page>
  );
}

export default function HomePage() {
  const auth = useQuery({ queryKey: authQueryKey, queryFn: bridge.authStatus });

  if (auth.isPending) {
    return (
      <Page title="Home" label="GitNapse // Dashboard">
        <StatusLine kind="loading" />
      </Page>
    );
  }

  if (auth.isError) {
    return (
      <Page title="Home" label="GitNapse // Dashboard">
        <div className="settings-row">
          <StatusLine kind="error" message={auth.error.message} />
          <Button variant="technical" icon={RefreshCw} onClick={() => void auth.refetch()}>
            Retry
          </Button>
        </div>
      </Page>
    );
  }

  if (!auth.data.has_token) {
    return (
      <Page title="Welcome" label="GitNapse // Onboarding">
        <Panel title="Connect to GitHub" label="Account">
          <AuthFlow variant="onboarding" />
        </Panel>
        <p className="t-caption">
          Signed-in mode loads your starred repositories, recent activity and rate limit.
        </p>
      </Page>
    );
  }

  return <Dashboard />;
}
