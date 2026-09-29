import type { RepoDto } from "./types";

export type SearchTab = "repos" | "users";
export type UserTab = "repos" | "starred" | "activity";
export type RepoSort = "updated" | "created" | "pushed" | "full_name";

export const searchTabs: ReadonlyArray<{ value: SearchTab; label: string }> = [
  { value: "repos", label: "Repositories" },
  { value: "users", label: "Users" },
];

export const userTabs: ReadonlyArray<{ value: UserTab; label: string }> = [
  { value: "repos", label: "Repositories" },
  { value: "starred", label: "Starred" },
  { value: "activity", label: "Activity" },
];

export const repoSortOptions: ReadonlyArray<{ value: RepoSort; label: string }> = [
  { value: "updated", label: "Updated" },
  { value: "created", label: "Created" },
  { value: "pushed", label: "Pushed" },
  { value: "full_name", label: "Name" },
];

export function parseSearchTab(value: string | null | undefined): SearchTab {
  return value === "users" ? "users" : "repos";
}

export function parseUserTab(value: string | null | undefined): UserTab {
  return value === "starred" || value === "activity" ? value : "repos";
}

export function parseRepoSort(value: string | null | undefined): RepoSort {
  if (value === "created" || value === "pushed" || value === "full_name") {
    return value;
  }
  return "updated";
}

export function repoLanguages(repos: readonly RepoDto[]): string[] {
  const languages = new Set<string>();
  for (const repo of repos) {
    if (repo.language) {
      languages.add(repo.language);
    }
  }
  return [...languages].sort((a, b) => a.localeCompare(b));
}

export function filterReposByLanguage(
  repos: readonly RepoDto[],
  language: string | null | undefined,
): RepoDto[] {
  if (!language) {
    return [...repos];
  }
  return repos.filter((repo) => repo.language === language);
}

export interface SearchParamInput {
  q?: string | null;
  tab?: SearchTab | null;
  language?: string | null;
}

export function buildSearchQuery(input: SearchParamInput): string {
  const params = new URLSearchParams();
  const query = input.q?.trim() ?? "";
  if (query.length > 0) {
    params.set("q", query);
  }
  if (input.tab === "users") {
    params.set("tab", "users");
  }
  if (input.language) {
    params.set("language", input.language);
  }
  const text = params.toString();
  return text.length > 0 ? `?${text}` : "";
}

export interface UserParamInput {
  tab?: UserTab | null;
  sort?: RepoSort | null;
}

export function buildUserQuery(input: UserParamInput): string {
  const params = new URLSearchParams();
  if (input.tab === "starred" || input.tab === "activity") {
    params.set("tab", input.tab);
  }
  if (input.tab === "repos" && input.sort && input.sort !== "updated") {
    params.set("sort", input.sort);
  }
  const text = params.toString();
  return text.length > 0 ? `?${text}` : "";
}
