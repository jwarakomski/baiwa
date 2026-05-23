import type { Contributor } from "../types/weather";

const KEY = "baiwa.contributors.v1";

function read(): Contributor[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Contributor[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: Contributor[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

export function loadContributors(): Contributor[] {
  return read().sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function addContributor(
  entry: Omit<Contributor, "id" | "createdAt">
): Contributor {
  const all = read();
  const next: Contributor = {
    ...entry,
    id: makeId(),
    createdAt: new Date().toISOString(),
  };
  write([next, ...all].slice(0, 200));
  return next;
}

export function removeContributor(id: string): void {
  write(read().filter((c) => c.id !== id));
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
