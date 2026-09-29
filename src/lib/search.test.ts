import { describe, expect, it } from "vitest";
import type { RepoDto } from "./types";
import {
  buildSearchQuery,
  buildUserQuery,
  filterReposByLanguage,
  parseRepoSort,
  parseSearchTab,
  parseUserTab,
  repoLanguages,
} from "./search";

function fixture(overrides: Partial<RepoDto> & { name: string }): RepoDto {
  const { name, ...rest } = overrides;
  return {
    full_name: `gitnapse/${name}`,
    name,
    owner: "gitnapse",
    description: null,
    stargazers_count: 0,
    language: null,
    default_branch: "main",
    clone_url: "https://github.com/gitnapse/x.git",
    html_url: "https://github.com/gitnapse/x",
    forks_count: null,
    open_issues_count: null,
    watchers_count: null,
    private: null,
    topics: null,
    updated_at: null,
    pushed_at: null,
    owner_avatar_url: null,
    ...rest,
  };
}

describe("parse helpers", () => {
  it("defaults to the first tab and sort", () => {
    expect(parseSearchTab(null)).toBe("repos");
    expect(parseSearchTab("users")).toBe("users");
    expect(parseSearchTab("orgs")).toBe("orgs");
    expect(parseSearchTab("code")).toBe("code");
    expect(parseSearchTab("bogus")).toBe("repos");
    expect(parseUserTab("starred")).toBe("starred");
    expect(parseUserTab("graph")).toBe("graph");
    expect(parseUserTab("bogus")).toBe("repos");
    expect(parseRepoSort(null)).toBe("updated");
    expect(parseRepoSort("pushed")).toBe("pushed");
    expect(parseRepoSort("bogus")).toBe("updated");
  });
});

describe("language helpers", () => {
  const repos = [
    fixture({ name: "a", language: "Rust" }),
    fixture({ name: "b", language: "TypeScript" }),
    fixture({ name: "c", language: "Rust" }),
    fixture({ name: "d", language: null }),
  ];

  it("collects unique sorted languages", () => {
    expect(repoLanguages(repos)).toEqual(["Rust", "TypeScript"]);
  });

  it("filters by language and passes everything through when unset", () => {
    expect(filterReposByLanguage(repos, "Rust").map((repo) => repo.name)).toEqual(["a", "c"]);
    expect(filterReposByLanguage(repos, "").length).toBe(4);
  });
});

describe("query building", () => {
  it("encodes search state and drops defaults", () => {
    expect(buildSearchQuery({})).toBe("");
    expect(buildSearchQuery({ q: "glass ui" })).toBe("?q=glass+ui");
    expect(buildSearchQuery({ q: "glass", tab: "users" })).toBe("?q=glass&tab=users");
    expect(buildSearchQuery({ q: "glass", tab: "orgs" })).toBe("?q=glass&tab=orgs");
    expect(buildSearchQuery({ q: "glass", tab: "code" })).toBe("?q=glass&tab=code");
    expect(buildSearchQuery({ q: "glass", tab: "repos" })).toBe("?q=glass");
    expect(buildSearchQuery({ q: "glass", language: "Rust" })).toBe("?q=glass&language=Rust");
  });

  it("encodes user tab and sort state", () => {
    expect(buildUserQuery({})).toBe("");
    expect(buildUserQuery({ tab: "starred" })).toBe("?tab=starred");
    expect(buildUserQuery({ tab: "graph" })).toBe("?tab=graph");
    expect(buildUserQuery({ tab: "repos", sort: "pushed" })).toBe("?sort=pushed");
    expect(buildUserQuery({ tab: "repos", sort: "updated" })).toBe("");
  });
});
