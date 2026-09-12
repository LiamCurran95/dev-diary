import type { PullRequest } from "./types";

const API = "https://api.github.com";

/** The search endpoint allows ~30 requests/minute, so pace requests ~2s apart. */
const SEARCH_SPACING_MS = 2100;

/** A single search query can never page past 1000 results. */
const SEARCH_RESULT_CAP = 1000;
const PER_PAGE = 100;

export class GitHubError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "GitHubError";
    this.status = status;
  }
}

type SearchItem = {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  closed_at: string | null;
  repository_url?: string;
  pull_request?: { html_url?: string };
};

let lastSearchAt = 0;

async function pace(): Promise<void> {
  const wait = lastSearchAt + SEARCH_SPACING_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastSearchAt = Date.now();
}

async function ghFetch(url: string, token: string, signal?: AbortSignal): Promise<Response> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal,
    });

    if (res.status !== 403 && res.status !== 429) return res;

    // Secondary rate limit or abuse detection: back off and retry.
    const retryAfter = Number(res.headers.get("retry-after"));
    const reset = Number(res.headers.get("x-ratelimit-reset"));
    const remaining = Number(res.headers.get("x-ratelimit-remaining"));

    if (res.status === 403 && remaining !== 0 && !retryAfter) return res; // genuine permission error

    const waitMs = retryAfter
      ? retryAfter * 1000
      : reset
        ? Math.max(0, reset * 1000 - Date.now()) + 1000
        : 2 ** attempt * 2000;

    await new Promise((r) => setTimeout(r, Math.min(waitMs, 60_000)));
  }

  throw new GitHubError("GitHub kept rate limiting the request after several retries.", 429);
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { message?: string };
    return body.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export async function getViewer(
  token: string,
  signal?: AbortSignal,
): Promise<{ login: string; name: string | null }> {
  const res = await ghFetch(`${API}/user`, token, signal);
  if (!res.ok) {
    throw new GitHubError(
      res.status === 401
        ? "GitHub rejected that token. Check it hasn't expired and has repo scope."
        : `Could not read your GitHub account: ${await readError(res)}`,
      res.status,
    );
  }
  const body = (await res.json()) as { login: string; name: string | null };
  return { login: body.login, name: body.name };
}

function mapItem(item: SearchItem): PullRequest {
  return {
    id: item.id,
    number: item.number,
    title: item.title,
    body: item.body ?? "",
    url: item.pull_request?.html_url ?? item.html_url,
    repo: (item.repository_url ?? "").replace(`${API}/repos/`, ""),
    mergedAt: item.closed_at ?? "",
  };
}

export type FetchOptions = {
  token: string;
  login: string;
  /** YYYY-MM-DD */
  since: string;
  /** YYYY-MM-DD */
  until: string;
  /** Optional raw search qualifiers, e.g. "org:legitfit" or "repo:owner/name". */
  scope?: string;
  signal?: AbortSignal;
  onProgress?: (message: string) => void;
};

function midpoint(start: string, end: string): string {
  const a = Date.parse(`${start}T00:00:00Z`);
  const z = Date.parse(`${end}T00:00:00Z`);
  return new Date(a + Math.floor((z - a) / 2)).toISOString().slice(0, 10);
}

async function searchWindow(
  opts: FetchOptions,
  start: string,
  end: string,
  collected: Map<number, PullRequest>,
): Promise<void> {
  const qualifiers = [
    "is:pr",
    "is:merged",
    `author:${opts.login}`,
    opts.scope?.trim(),
    `merged:${start}..${end}`,
  ].filter(Boolean);

  const query = encodeURIComponent(qualifiers.join(" "));
  const url = `${API}/search/issues?q=${query}&per_page=${PER_PAGE}&sort=updated&order=desc`;

  opts.onProgress?.(`Searching ${start} to ${end}…`);

  await pace();
  const first = await ghFetch(`${url}&page=1`, opts.token, opts.signal);
  if (!first.ok) {
    throw new GitHubError(`GitHub search failed: ${await readError(first)}`, first.status);
  }

  const body = (await first.json()) as { total_count: number; items: SearchItem[] };
  const total = body.total_count;

  // Past 1000 results GitHub stops paging, so halve the window and recurse.
  if (total > SEARCH_RESULT_CAP && start !== end) {
    const mid = midpoint(start, end);
    const nextDay = new Date(Date.parse(`${mid}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);
    opts.onProgress?.(`${total} results in ${start}..${end}; splitting the window.`);
    await searchWindow(opts, start, mid, collected);
    await searchWindow(opts, nextDay > end ? end : nextDay, end, collected);
    return;
  }

  for (const item of body.items) collected.set(item.id, mapItem(item));

  const pages = Math.min(Math.ceil(total / PER_PAGE), SEARCH_RESULT_CAP / PER_PAGE);
  for (let page = 2; page <= pages; page++) {
    opts.onProgress?.(`Fetching page ${page} of ${pages} for ${start}..${end}…`);
    await pace();
    const res = await ghFetch(`${url}&page=${page}`, opts.token, opts.signal);
    if (!res.ok) {
      throw new GitHubError(`GitHub search failed: ${await readError(res)}`, res.status);
    }
    const pageBody = (await res.json()) as { items: SearchItem[] };
    for (const item of pageBody.items) collected.set(item.id, mapItem(item));
  }
}

/**
 * Every merged PR you authored in the range, across all repos you can see
 * (or narrowed by `scope`). Paginated, throttled, and de-duplicated.
 */
export async function fetchMergedPullRequests(opts: FetchOptions): Promise<PullRequest[]> {
  const collected = new Map<number, PullRequest>();
  await searchWindow(opts, opts.since, opts.until, collected);

  const prs = [...collected.values()].filter((p) => p.mergedAt);
  prs.sort((a, z) => new Date(z.mergedAt).getTime() - new Date(a.mergedAt).getTime());
  opts.onProgress?.(`Found ${prs.length} merged pull requests.`);
  return prs;
}
