import type { AccuracyFeedback } from "../types/weather";

const KEY = "baiwa.feedback.v1";

function read(): AccuracyFeedback[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AccuracyFeedback[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: AccuracyFeedback[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(items));
}

export function loadFeedback(): AccuracyFeedback[] {
  return read().sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function addFeedback(
  entry: Omit<AccuracyFeedback, "id" | "createdAt">
): AccuracyFeedback {
  const all = read();
  const next: AccuracyFeedback = {
    ...entry,
    id: cryptoRandomId(),
    createdAt: new Date().toISOString(),
  };
  write([next, ...all].slice(0, 100));
  return next;
}

export function removeFeedback(id: string): void {
  const remaining = read().filter((f) => f.id !== id);
  write(remaining);
}

export function clearFeedback(): void {
  write([]);
}

function cryptoRandomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
