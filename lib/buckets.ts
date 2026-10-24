import type { Bucket, Granularity, PullRequest } from "./types";

const DAY_MS = 86_400_000;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Midnight UTC on the calendar day of `input`, so bucketing never drifts with timezone. */
function utcDay(input: string | Date): Date {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY_MS);
}

/** Monday of the ISO week containing `d`. */
function startOfISOWeek(d: Date): Date {
  const day = d.getUTCDay();
  return addDays(d, day === 0 ? -6 : 1 - day);
}

/** ISO-8601 week-numbering year and week number. */
function isoWeek(d: Date): { year: number; week: number } {
  const monday = startOfISOWeek(d);
  const thursday = addDays(monday, 3);
  const year = thursday.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const week = Math.floor((thursday.getTime() - jan1.getTime()) / (7 * DAY_MS)) + 1;
  return { year, week };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function humanDate(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

type Window = { key: string; label: string; start: Date; end: Date };

/** The bucket a given date falls into, at the requested granularity. */
export function windowFor(date: Date, granularity: Granularity): Window {
  const d = utcDay(date);

  switch (granularity) {
    case "day":
      return { key: isoDate(d), label: humanDate(d), start: d, end: d };

    case "week": {
      const { year, week } = isoWeek(d);
      const start = startOfISOWeek(d);
      return {
        key: `${year}-W${pad(week)}`,
        label: `Week of ${humanDate(start)}`,
        start,
        end: addDays(start, 6),
      };
    }

    case "fortnight": {
      const { year, week } = isoWeek(d);
      const index = Math.floor((week - 1) / 2);
      // Step back to the Monday of the first week in the pair.
      const weekStart = startOfISOWeek(d);
      const start = week % 2 === 0 ? addDays(weekStart, -7) : weekStart;
      return {
        key: `${year}-F${pad(index)}`,
        label: `Fortnight from ${humanDate(start)}`,
        start,
        end: addDays(start, 13),
      };
    }

    case "month": {
      const y = d.getUTCFullYear();
      const m = d.getUTCMonth();
      return {
        key: `${y}-${pad(m + 1)}`,
        label: `${MONTHS[m]} ${y}`,
        start: new Date(Date.UTC(y, m, 1)),
        end: new Date(Date.UTC(y, m + 1, 0)),
      };
    }

    case "quarter": {
      const y = d.getUTCFullYear();
      const q = Math.floor(d.getUTCMonth() / 3);
      return {
        key: `${y}-Q${q + 1}`,
        label: `Q${q + 1} ${y}`,
        start: new Date(Date.UTC(y, q * 3, 1)),
        end: new Date(Date.UTC(y, q * 3 + 3, 0)),
      };
    }
  }
}

/**
 * Group pull requests into timeframe buckets, newest first.
 * Pure and synchronous: changing granularity costs no network calls.
 */
export function groupIntoBuckets(prs: PullRequest[], granularity: Granularity): Bucket[] {
  const byKey = new Map<string, Bucket>();

  for (const pr of prs) {
    if (!pr.mergedAt) continue;
    const w = windowFor(new Date(pr.mergedAt), granularity);

    let bucket = byKey.get(w.key);
    if (!bucket) {
      bucket = {
        key: w.key,
        label: w.label,
        start: isoDate(w.start),
        end: isoDate(w.end),
        prs: [],
      };
      byKey.set(w.key, bucket);
    }
    bucket.prs.push(pr);
  }

  const buckets = [...byKey.values()];
  for (const b of buckets) {
    b.prs.sort((a, z) => new Date(z.mergedAt).getTime() - new Date(a.mergedAt).getTime());
  }
  buckets.sort((a, z) => (z.start < a.start ? -1 : z.start > a.start ? 1 : 0));
  return buckets;
}
