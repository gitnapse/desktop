const STORAGE_KEY = "gitnapse.local.cwd";

export function loadLocalCwd(): string | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value && value.trim().length > 0 ? value : null;
  } catch {
    return null;
  }
}

export function saveLocalCwd(cwd: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, cwd);
  } catch {
    return;
  }
}

export function clearLocalCwd(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    return;
  }
}
