import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { RefreshCw, Search as SearchIcon } from "lucide-react";
import { Page } from "../Page";
import {
  Button,
  EmptyState,
  RepoCard,
  Select,
  StatusLine,
  Tabs,
  UserCard,
} from "../../ui";
import * as bridge from "../../lib/bridge";
import { repoPath } from "../../lib/format";
import {
  buildSearchQuery,
  filterReposByLanguage,
  parseSearchTab,
  repoLanguages,
  searchTabs,
} from "../../lib/search";

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const tab = parseSearchTab(params.get("tab"));
  const language = params.get("language") ?? "";
  const [draft, setDraft] = useState(query);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(query);
  }, [query]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const repos = useQuery({
    queryKey: ["search-repos", query],
    queryFn: () => bridge.searchRepos(query, 1, 30),
    enabled: query.length > 0 && tab === "repos",
  });
  const users = useQuery({
    queryKey: ["search-users", query],
    queryFn: () => bridge.searchUsers(query, 1, 30),
    enabled: query.length > 0 && tab === "users",
  });

  const languages = repoLanguages(repos.data ?? []);
  const activeLanguage = language.length > 0 && languages.includes(language) ? language : "";
  const filteredRepos = filterReposByLanguage(repos.data ?? [], activeLanguage || null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setParams(buildSearchQuery({ q: draft.trim(), tab, language }));
  }

  return (
    <Page title="Search" label="GitNapse // Discovery">
      <form className="searchbar" role="search" onSubmit={submit}>
        <SearchIcon size={16} strokeWidth={1.5} aria-hidden="true" />
        <input
          ref={inputRef}
          className="input searchbar__input"
          type="search"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Repositories by name, description or language"
          aria-label="Search repositories"
          spellCheck={false}
        />
        <Button type="submit" variant="technical" disabled={draft.trim().length === 0}>
          Search
        </Button>
      </form>

      <Tabs
        ariaLabel="Search scope"
        value={tab}
        items={searchTabs}
        onChange={(value) => {
          setParams(
            buildSearchQuery({ q: query, tab: parseSearchTab(value), language: activeLanguage }),
          );
        }}
      />

      {query.length === 0 ? (
        <EmptyState
          title="READY TO SEARCH"
          hint="Type a query and press Enter. Press / anywhere to focus the field."
        />
      ) : null}

      {query.length > 0 && tab === "repos" ? (
        <>
          {repos.isPending ? <StatusLine kind="loading" /> : null}
          {repos.isError ? (
            <div className="settings-row">
              <StatusLine kind="error" message={repos.error.message} />
              <Button variant="technical" icon={RefreshCw} onClick={() => void repos.refetch()}>
                Retry
              </Button>
            </div>
          ) : null}
          {repos.isSuccess ? (
            <>
              <div className="searchfilters">
                {languages.length > 0 ? (
                  <div className="searchfilters__select">
                    <Select
                      label="Language"
                      placeholder="All languages"
                      value={activeLanguage}
                      options={languages.map((entry) => ({ value: entry, label: entry }))}
                      onChange={(event) =>
                        setParams(
                          buildSearchQuery({ q: query, tab: "repos", language: event.target.value }),
                        )
                      }
                    />
                  </div>
                ) : null}
                <span className="t-label searchfilters__count">{`${filteredRepos.length} REPOSITOR${filteredRepos.length === 1 ? "Y" : "IES"}`}</span>
              </div>
              {filteredRepos.length === 0 ? (
                <EmptyState
                  title="NO REPOSITORIES"
                  hint={
                    activeLanguage
                      ? `Nothing matched “${query}” in ${activeLanguage}.`
                      : `Nothing matched “${query}”.`
                  }
                  action={
                    activeLanguage ? (
                      <Button
                        variant="technical"
                        onClick={() => setParams(buildSearchQuery({ q: query, tab: "repos" }))}
                      >
                        Clear filters
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="cardgrid">
                  {filteredRepos.map((repo) => (
                    <RepoCard key={repo.full_name} repo={repo} to={repoPath(repo)} />
                  ))}
                </div>
              )}
            </>
          ) : null}
        </>
      ) : null}

      {query.length > 0 && tab === "users" ? (
        <>
          {users.isPending ? <StatusLine kind="loading" /> : null}
          {users.isError ? (
            <div className="settings-row">
              <StatusLine kind="error" message={users.error.message} />
              <Button variant="technical" icon={RefreshCw} onClick={() => void users.refetch()}>
                Retry
              </Button>
            </div>
          ) : null}
          {users.isSuccess && users.data.length === 0 ? (
            <EmptyState title="NO USERS" hint={`No login matched “${query}”.`} />
          ) : null}
          {users.isSuccess && users.data.length > 0 ? (
            <div className="cardgrid cardgrid--users">
              {users.data.map((user) => (
                <UserCard
                  key={user.login}
                  user={user}
                  meta={`${user.followers} followers · ${user.public_repos} repos`}
                />
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </Page>
  );
}
