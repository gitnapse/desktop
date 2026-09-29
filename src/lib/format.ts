import type { EventDto, RepoDto } from "./types";

export type TimeInput = string | number | Date;

const MINUTE = 60;
const HOUR = 3_600;
const DAY = 86_400;
const WEEK = 604_800;
const MONTH = 2_592_000;
const YEAR = 31_536_000;

const unitDivisions = [
  { unit: "year", seconds: YEAR },
  { unit: "month", seconds: MONTH },
  { unit: "week", seconds: WEEK },
  { unit: "day", seconds: DAY },
  { unit: "hour", seconds: HOUR },
  { unit: "minute", seconds: MINUTE },
] as const;

function parseDate(value: TimeInput): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatRelativeTime(
  value: TimeInput,
  now: TimeInput = Date.now(),
  locale?: string,
): string {
  const date = parseDate(value);
  const reference = parseDate(now);
  if (!date || !reference) {
    return "—";
  }
  const seconds = (date.getTime() - reference.getTime()) / 1000;
  const absolute = Math.abs(seconds);
  if (absolute < 60) {
    return "now";
  }
  const division =
    unitDivisions.find((entry) => absolute >= entry.seconds) ??
    ({ unit: "minute", seconds: MINUTE } as const);
  const amount = Math.floor(absolute / division.seconds);
  const formatted = new Intl.NumberFormat(locale, {
    style: "unit",
    unit: division.unit,
    unitDisplay: division.unit === "month" ? "short" : "narrow",
  }).format(amount);
  return seconds > 0 ? `+${formatted}` : formatted;
}

export function formatAbsoluteTime(
  value: TimeInput,
  locale?: string,
): { iso: string; label: string } | null {
  const date = parseDate(value);
  if (!date) {
    return null;
  }
  return { iso: date.toISOString(), label: date.toLocaleString(locale) };
}

export function formatCount(value: number, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function authSourceLabel(source: string | null | undefined): string {
  const normalized = (source ?? "none").trim().toLowerCase();
  if (normalized.length === 0) {
    return "NONE";
  }
  return normalized.toUpperCase();
}

export function eventKindLabel(kind: string): string {
  return kind.replace(/_/g, " ").toUpperCase();
}

export function eventDescription(
  event: Pick<EventDto, "kind" | "title" | "repo">,
): string {
  const title = (event.title ?? "").trim();
  if (title.length > 0) {
    return title;
  }
  const kind = eventKindLabel(event.kind);
  return event.repo ? `${kind} in ${event.repo}` : kind;
}

export function externalUrl(value: string): string {
  const trimmed = value.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function repoPath(repo: Pick<RepoDto, "owner" | "name">): string {
  return `/repos/${repo.owner}/${repo.name}`;
}
