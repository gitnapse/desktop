export function joinUrlPath(base: string, path: string): string {
  const cleanBase = base.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  const encoded = cleanPath
    .split("/")
    .filter((segment) => segment.length > 0)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return encoded.length > 0 ? `${cleanBase}/${encoded}` : cleanBase;
}

export function rawUrl(fullName: string, ref: string | null, path: string): string {
  const branch = ref && ref.trim().length > 0 ? ref.trim() : "HEAD";
  const base = `https://raw.githubusercontent.com/${fullName}/${encodeURIComponent(branch)}`;
  return joinUrlPath(base, path);
}

export function blobUrl(fullName: string, ref: string | null, path: string): string {
  const branch = ref && ref.trim().length > 0 ? ref.trim() : "HEAD";
  const base = `https://github.com/${fullName}/blob/${encodeURIComponent(branch)}`;
  return joinUrlPath(base, path);
}

export function compareUrl(fullName: string, base: string, head: string): string {
  return `https://github.com/${fullName}/compare/${encodeURIComponent(base)}...${encodeURIComponent(head)}`;
}

export function localClonePath(baseDir: string, fullName: string): string {
  return joinUrlPath(baseDir.replace(/\\/g, "/").replace(/\/+$/, ""), fullName);
}
