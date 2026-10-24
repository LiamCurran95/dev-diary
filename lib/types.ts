export type PullRequest = {
  id: number;
  number: number;
  title: string;
  body: string;
  url: string;
  /** "owner/name" */
  repo: string;
  /** ISO timestamp the PR was merged (search reports this as closed_at). */
  mergedAt: string;
};

export type Granularity = "day" | "week" | "fortnight" | "month" | "quarter";

export type Bucket = {
  /** Stable identifier, e.g. "2026-W10". Used as a cache key. */
  key: string;
  label: string;
  /** YYYY-MM-DD */
  start: string;
  /** YYYY-MM-DD */
  end: string;
  prs: PullRequest[];
};

export const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "fortnight", label: "Fortnightly" },
  { value: "month", label: "Monthly" },
  { value: "quarter", label: "Quarterly" },
];
