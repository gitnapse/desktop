const isTauri = () => "__TAURI_INTERNALS__" in window;

interface AuthStatus {
  has_token: boolean;
  source: string;
}

interface Repo {
  full_name: string;
  name: string;
  owner: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  default_branch: string;
  clone_url: string;
}

const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing element #${id}`);
  return el as T;
};

const repoInput = $<HTMLInputElement>("repo");
const destInput = $<HTMLInputElement>("dest");
const output = $<HTMLPreElement>("output");
const authChip = $<HTMLSpanElement>("auth-status");
const modeBanner = $<HTMLDivElement>("mode");
const actions = $<HTMLDivElement>("actions");
const apiChip = $<HTMLSpanElement>("api-status");
const apiHint = $<HTMLParagraphElement>("gh-hint");
const results = $<HTMLUListElement>("gh-results");

let lastClonePath = "";

function show(message: string, kind: "ok" | "err") {
  output.textContent = message;
  output.classList.add("show");
  output.classList.remove("ok", "err");
  output.classList.add(kind);
}

async function tauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const { invoke } = await import("@tauri-apps/api/core");
  return invoke<T>(command, args);
}

async function refreshAuth() {
  try {
    if (isTauri()) {
      const status = await tauri<AuthStatus>("auth_status");
      authChip.textContent = status.has_token
        ? `authenticated (${status.source})`
        : "no token";
      authChip.classList.toggle("on", status.has_token);
    } else {
      authChip.textContent = "preview (mock)";
      authChip.classList.add("on");
    }
  } catch {
    authChip.textContent = "status unavailable";
  }
}

async function refreshDest() {
  try {
    destInput.value = isTauri()
      ? await tauri<string>("clone_dir")
      : "/mock/projects";
  } catch {
    /* config missing; keep placeholder */
  }
}

async function pickFolder() {
  if (!isTauri()) {
    show("Folder picker requires the desktop app (preview mode).", "err");
    return;
  }
  const { open } = await import("@tauri-apps/plugin-dialog");
  const chosen = await open({ directory: true, multiple: false });
  if (chosen) destInput.value = String(chosen);
}

async function cloneRepo() {
  const spec = repoInput.value.trim();
  if (!spec) {
    show("Enter a repository first (owner/name or a git URL).", "err");
    return;
  }
  const dest = destInput.value.trim();
  const button = $<HTMLButtonElement>("clone");
  button.disabled = true;
  actions.classList.remove("show");
  try {
    if (isTauri()) {
      lastClonePath = await tauri<string>("clone_repo", { spec, dir: dest });
      show(`Cloned into ${lastClonePath}`, "ok");
    } else {
      lastClonePath = `${dest}/owner/name`;
      show(`[preview] Would clone "${spec}" into ${lastClonePath}`, "ok");
    }
    actions.classList.add("show");
  } catch (e) {
    show(String(e), "err");
  } finally {
    button.disabled = false;
  }
}

async function openCloneFolder() {
  if (!lastClonePath) return;
  if (!isTauri()) {
    show("[preview] No file manager in the browser.", "err");
    return;
  }
  try {
    await tauri("open_in_file_manager", { path: lastClonePath });
  } catch (e) {
    show(String(e), "err");
  }
}

async function saveDir() {
  const dir = destInput.value.trim();
  if (!dir) return;
  try {
    if (isTauri()) {
      await tauri("set_clone_dir", { dir });
    }
    show(`Default folder saved: ${dir}`, "ok");
  } catch (e) {
    show(String(e), "err");
  }
}

// ── GitHub (via the GitNapse API) ───────────────────────────────────────

const SERVER_HINT =
  "No GitNapse API server reachable. Start one with " +
  "`gitnapse-server` (from the api repo) or set GITNAPSE_SERVER_URL.";

async function checkApi() {
  apiHint.classList.remove("err");
  apiHint.textContent = "";
  try {
    if (!isTauri()) {
      apiChip.textContent = "preview";
      apiChip.classList.add("on");
      return;
    }
    const status = await tauri<string>("server_status");
    apiChip.textContent = status;
    apiChip.classList.add("on");
  } catch {
    apiChip.textContent = "offline";
    apiChip.classList.remove("on");
    apiHint.textContent = SERVER_HINT;
    apiHint.classList.add("err");
  }
}

function renderRepo(repo: Repo) {
  const li = document.createElement("li");

  const name = document.createElement("span");
  name.className = "name";
  name.textContent = repo.full_name;

  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = `  ${repo.stargazers_count} stars${
    repo.language ? ` · ${repo.language}` : ""
  }`;

  li.append(name, meta);
  if (repo.description) {
    const desc = document.createElement("div");
    desc.className = "desc";
    desc.textContent = repo.description;
    li.append(desc);
  }

  li.addEventListener("click", () => {
    repoInput.value = repo.full_name;
    show(`Selected ${repo.full_name}. Set a folder and press Clone.`, "ok");
  });
  return li;
}

async function searchGitHub() {
  const query = $<HTMLInputElement>("gh-query").value.trim() || "gitnapse";
  results.replaceChildren();
  apiHint.textContent = "Searching...";
  apiHint.classList.remove("err");
  try {
    const repos = isTauri()
      ? await tauri<Repo[]>("search_repos", { query, perPage: 20 })
      : mockSearch(query);
    results.replaceChildren();
    apiHint.textContent = "";
    if (!repos.length) {
      const empty = document.createElement("li");
      empty.textContent = "No results.";
      results.append(empty);
      return;
    }
    for (const repo of repos) results.append(renderRepo(repo));
  } catch (e) {
    apiHint.textContent = SERVER_HINT;
    apiHint.classList.add("err");
  }
}

function mockSearch(query: string): Repo[] {
  return [
    {
      full_name: `gitnapse/${query}`,
      name: query,
      owner: "gitnapse",
      description: "[preview] Repository from a mocked search.",
      stargazers_count: 42,
      language: "Rust",
      default_branch: "main",
      clone_url: `https://github.com/gitnapse/${query}.git`,
    },
  ];
}

function init() {
  if (!isTauri()) {
    modeBanner.textContent =
      "Preview mode (browser): Tauri commands are mocked. Run `npm run tauri dev` for the real app.";
    modeBanner.classList.add("show");
  }
  $<HTMLButtonElement>("clone").addEventListener("click", cloneRepo);
  $<HTMLButtonElement>("pick").addEventListener("click", pickFolder);
  $<HTMLButtonElement>("save-dir").addEventListener("click", saveDir);
  $<HTMLButtonElement>("open-folder").addEventListener("click", openCloneFolder);
  repoInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") cloneRepo();
  });
  $<HTMLButtonElement>("check-api").addEventListener("click", checkApi);
  $<HTMLButtonElement>("gh-search").addEventListener("click", searchGitHub);
  $<HTMLInputElement>("gh-query").addEventListener("keydown", (e) => {
    if (e.key === "Enter") searchGitHub();
  });
}

init();
refreshAuth();
refreshDest();
checkApi();
searchGitHub();
