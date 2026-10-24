import { entryHeader, entryPullRequests } from "./prompts";
import type { Bucket, PullRequest } from "./types";

/**
 * Demo mode: sample pull requests from a fictional team, and a stand-in for the
 * model that writes entries from them locally. Lets anyone try the whole flow
 * without a GitHub account or an API key, and nothing leaves the browser.
 */

export const DEMO_LOGIN = "demo-dev";
export const DEMO_MODEL = "demo";

type Theme = {
  /** Completes "This period was mostly about …". */
  focus: string;
  /** A STAR highlight, used when two or more of the theme's PRs share a period. */
  star?: {
    title: string;
    situation: string;
    task: string;
    /** The PR whose merge is the outcome; before it lands, the Result is flagged as unknown. */
    resultPr?: number;
    result?: string;
  };
};

const THEMES = {
  ci: {
    focus: "making CI fast enough that nobody waits on it",
    star: {
      title: "Faster CI",
      situation:
        "Every repository installed its dependencies from scratch on each run, and the web pipeline took about 14 minutes.",
      task: "Cut CI time across the repositories, without tuning each pipeline separately.",
      resultPr: 1211,
      result:
        "The web pipeline went from about 14 minutes to about 6, and cold installs from about 4 minutes to about 40 seconds on a cache hit.",
    },
  },
  tokens: {
    focus: "putting the design system on semantic colour tokens",
    star: {
      title: "Semantic tokens and dark mode",
      situation:
        "Components referenced raw hex values, so every new theme would have meant changing every component.",
      task: "Make theming a token change rather than a component change.",
      resultPr: 312,
      result:
        "Dark mode shipped without any component changes, and the light-mode visual diff stayed empty.",
    },
  },
  auth: {
    focus: "migrating sessions to short-lived tokens",
    star: {
      title: "Short-lived session tokens",
      situation:
        "API sessions used long-lived opaque tokens, and mobile releases lag behind web, so a hard switch would log mobile users out.",
      task: "Move sessions to short-lived tokens without forcing anyone to log in again.",
      resultPr: 671,
      result:
        "The web client runs on short-lived tokens with reuse detection, and mobile clients have a 30-day window to follow.",
    },
  },
  observability: {
    focus: "making the API observable",
    star: {
      title: "API observability",
      situation:
        "API logs were unstructured, so a single request could not be followed end to end, and the new checkout was about to roll out.",
      task: "Make failures visible on a dashboard before they show up in support.",
      resultPr: 704,
      result:
        "Every log line carries its request id, and the checkout rollout was covered by an error-rate alert from day one.",
    },
  },
  checkout: {
    focus: "rebuilding checkout",
    star: {
      title: "Checkout rebuild",
      situation:
        "Checkout was a single-page legacy form that only validated after a failed submit.",
      task: "Replace it with a guided flow, without a risky all-at-once launch.",
      resultPr: 1318,
      result:
        "The new checkout serves every account after two clean weeks at 10%, and the legacy form has been deleted.",
    },
  },
  perf: {
    focus: "cutting the product page's JavaScript",
    star: {
      title: "A lighter product page",
      situation:
        "The product page bundle carried the reviews widget and moment, although reviews sit below the fold.",
      task: "Cut the JavaScript that blocks the product page's first render.",
      // No result: the PRs never measured one, which is what the flag is for.
    },
  },
  upkeep: {
    focus: "routine upkeep",
  },
} satisfies Record<string, Theme>;

type ThemeId = keyof typeof THEMES;

type DemoPr = {
  daysAgo: number;
  repo: string;
  number: number;
  theme: ThemeId;
  title: string;
  /** One sentence on what this PR did: part of a highlight's Action, or an Also shipped bullet. */
  change: string;
  body: string;
};

const WEB = "example-co/web";
const API = "example-co/api";
const DS = "example-co/design-system";
const INFRA = "example-co/infra";

const DEMO_PRS: DemoPr[] = [
  {
    daysAgo: 176,
    repo: INFRA,
    number: 88,
    theme: "ci",
    title: "Add a reusable workflow for dependency caching",
    change: "Added a shared CI workflow that caches dependencies by lockfile hash.",
    body: "Every repo installs from scratch on each run. This adds a reusable workflow keyed on the lockfile hash.",
  },
  {
    daysAgo: 171,
    repo: WEB,
    number: 1204,
    theme: "ci",
    title: "Use the shared caching workflow",
    change: "Moved the web app's pipeline onto the shared caching workflow.",
    body: "Switches web CI to the shared workflow. Cold installs drop from ~4 minutes to ~40 seconds on a cache hit.",
  },
  {
    daysAgo: 165,
    repo: WEB,
    number: 1211,
    theme: "ci",
    title: "Shard the test suite across four parallel jobs",
    change:
      "Split the web test suite across four parallel jobs.",
    body: "Shards Vitest by file across four jobs. End-to-end pipeline goes from ~14 to ~6 minutes.",
  },
  {
    daysAgo: 158,
    repo: DS,
    number: 301,
    theme: "tokens",
    title: "Introduce semantic colour tokens",
    change:
      "Introduced semantic colour tokens (surface, text, border, accent) to the design system.",
    body: "Adds a semantic layer over the raw palette so components stop referencing hex values directly.",
  },
  {
    daysAgo: 151,
    repo: DS,
    number: 305,
    theme: "tokens",
    title: "Migrate Button, Input and Card to semantic tokens",
    change: "Migrated the core form and layout components to semantic tokens.",
    body: "First batch of components moved over. Visual diff is empty in light mode.",
  },
  {
    daysAgo: 146,
    repo: API,
    number: 640,
    theme: "upkeep",
    title: "Upgrade to Node 22",
    change: "Upgraded the API to Node 22.",
    body: "Node 18 reaches end of life soon. No code changes needed beyond the engines field and CI image.",
  },
  {
    daysAgo: 139,
    repo: DS,
    number: 312,
    theme: "tokens",
    title: "Add a dark theme",
    change: "Added a dark theme driven entirely by the semantic tokens.",
    body: "Defines dark values for every semantic token. No component changes were needed.",
  },
  {
    daysAgo: 134,
    repo: API,
    number: 652,
    theme: "auth",
    title: "Issue short-lived JWTs alongside opaque tokens",
    change: "Started issuing short-lived JWTs alongside the existing opaque session tokens.",
    body: "First step of the session migration. Both token types are accepted; clients don't change yet.",
  },
  {
    daysAgo: 127,
    repo: API,
    number: 658,
    theme: "auth",
    title: "Refresh-token rotation with reuse detection",
    change:
      "Added refresh-token rotation, revoking the whole token family if a refresh token is reused.",
    body: "Each refresh issues a new refresh token. Reuse of an old one revokes the family, which catches token theft.",
  },
  {
    daysAgo: 121,
    repo: WEB,
    number: 1240,
    theme: "auth",
    title: "Move the web client to JWT sessions",
    change: "Moved the web client onto JWT sessions with silent refresh.",
    body: "Web now uses the new tokens and refreshes in the background before expiry.",
  },
  {
    daysAgo: 113,
    repo: API,
    number: 671,
    theme: "auth",
    title: "Schedule removal of opaque tokens after a 30-day overlap",
    change:
      "Set a 30-day overlap before opaque tokens stop being accepted, so mobile clients can update first.",
    body: "Mobile releases lag web. Keeping both token types valid for 30 days avoids forced logouts.",
  },
  {
    daysAgo: 108,
    repo: API,
    number: 675,
    theme: "observability",
    title: "Structured JSON logging with request ids",
    change: "Switched the API to structured JSON logs carrying a request id.",
    body: "Replaces printf-style logs. Every line now carries the request id so one request can be followed end to end.",
  },
  {
    daysAgo: 101,
    repo: API,
    number: 683,
    theme: "observability",
    title: "Add OpenTelemetry tracing",
    change: "Added OpenTelemetry tracing across the API's HTTP and database layers.",
    body: "Instrumented with OpenTelemetry rather than the vendor SDK, so the backend can change without code changes.",
  },
  {
    daysAgo: 96,
    repo: DS,
    number: 320,
    theme: "upkeep",
    title: "Fix focus ring contrast in dark mode",
    change: "Fixed focus rings that were too low-contrast in dark mode.",
    body: "Focus ring used a raw palette value that failed contrast on dark surfaces. Now uses the focus token.",
  },
  {
    daysAgo: 89,
    repo: WEB,
    number: 1262,
    theme: "perf",
    title: "Lazy-load the reviews widget",
    change:
      "Lazy-loaded the reviews widget on the product page, so it no longer blocks first render.",
    body: "Reviews were in the main bundle but sit below the fold. Now loaded when scrolled into view.",
  },
  {
    daysAgo: 84,
    repo: WEB,
    number: 1268,
    theme: "perf",
    title: "Replace moment with Intl.DateTimeFormat",
    change:
      "Replaced moment with native Intl formatting, removing the largest dependency in the bundle.",
    body: "moment was the largest dependency in the product page bundle. Intl covers every format we use.",
  },
  {
    daysAgo: 77,
    repo: WEB,
    number: 1275,
    theme: "checkout",
    title: "Checkout: step layout and progress indicator",
    change: "Laid out the new checkout as three steps with a progress indicator.",
    body: "Scaffolds the new checkout behind the new-checkout flag. Nothing changes for users yet.",
  },
  {
    daysAgo: 72,
    repo: API,
    number: 699,
    theme: "checkout",
    title: "Saved addresses endpoint",
    change: "Added an API for saving and reusing delivery addresses.",
    body: "CRUD for saved addresses, scoped to the account. Backs the address step in the new checkout.",
  },
  {
    daysAgo: 66,
    repo: WEB,
    number: 1283,
    theme: "checkout",
    title: "Checkout: address step with saved addresses",
    change: "Built the address step, offering saved addresses before the full form.",
    body: "Shows saved addresses first and falls back to the form. Validates postcodes inline.",
  },
  {
    daysAgo: 61,
    repo: API,
    number: 704,
    theme: "observability",
    title: "Alert on checkout error rate",
    change:
      "Added an alert that fires when the checkout error rate rises above its normal baseline.",
    body: "Alerts on the 5-minute checkout error rate, so the new checkout's rollout is watched from day one.",
  },
  {
    daysAgo: 55,
    repo: WEB,
    number: 1291,
    theme: "checkout",
    title: "Checkout: inline payment validation",
    change: "Added inline validation to the payment step, so card errors show before submit.",
    body: "Validates card number, expiry and CVC as the user types instead of after a failed submit.",
  },
  {
    daysAgo: 49,
    repo: WEB,
    number: 1297,
    theme: "checkout",
    title: "Checkout: review step and order summary",
    change: "Finished the new checkout with a review step and order summary.",
    body: "Final step. The new checkout is now complete end to end behind the flag.",
  },
  {
    daysAgo: 43,
    repo: INFRA,
    number: 102,
    theme: "checkout",
    title: "Per-account flag for the new checkout",
    change:
      "Added a per-account flag so the new checkout can roll out gradually and be switched off without a deploy.",
    body: "Moves the new-checkout flag from global to per-account, so rollout can be staged.",
  },
  {
    daysAgo: 38,
    repo: WEB,
    number: 1304,
    theme: "upkeep",
    title: "Fix double-submit on slow networks",
    change: "Fixed orders that could be placed twice on slow connections.",
    body: "The place-order button stayed enabled during the request. Now disabled until the response lands.",
  },
  {
    daysAgo: 31,
    repo: WEB,
    number: 1310,
    theme: "checkout",
    title: "Roll the new checkout out to 10% of accounts",
    change: "Rolled the new checkout out to 10% of accounts.",
    body: "Turns the flag on for 10% of accounts. Error-rate alert stays green over the first week.",
  },
  {
    daysAgo: 24,
    repo: API,
    number: 718,
    theme: "upkeep",
    title: "Bump dependencies and fix a deprecated Postgres driver call",
    change: "Updated dependencies and replaced a deprecated database driver call.",
    body: "Routine bump. One driver call was deprecated; swapped for the supported equivalent.",
  },
  {
    daysAgo: 17,
    repo: WEB,
    number: 1318,
    theme: "checkout",
    title: "Roll the new checkout out to all accounts",
    change: "Rolled the new checkout out to every account.",
    body: "Flag on for 100% after two clean weeks at 10%.",
  },
  {
    daysAgo: 10,
    repo: WEB,
    number: 1325,
    theme: "checkout",
    title: "Remove the legacy checkout",
    change: "Deleted the legacy checkout now that the new one serves all traffic.",
    body: "Removes the old single-page form and its tests. Flag kept for one more release as a kill switch.",
  },
  {
    daysAgo: 4,
    repo: DS,
    number: 334,
    theme: "tokens",
    title: "Document the token system",
    change: "Wrote usage guidelines for the semantic tokens.",
    body: "Adds a docs page explaining which token to use where, with do and don't examples.",
  },
];

const DAY_MS = 86_400_000;

function demoPullRequests(now = new Date()): (PullRequest & { theme: ThemeId; change: string })[] {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return DEMO_PRS.map((pr, i) => {
    const slug = pr.repo.split("/")[1];
    return {
      id: 900_000 + i,
      number: pr.number,
      title: pr.title,
      body: pr.body,
      // example.com is reserved for examples, so these never point at a real repository.
      url: `https://example.com/${slug}/pull/${pr.number}`,
      repo: pr.repo,
      mergedAt: new Date(today - pr.daysAgo * DAY_MS + 15 * 3_600_000).toISOString(),
      theme: pr.theme,
      change: pr.change,
    };
  });
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException("Aborted", "AbortError"));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

/** Stands in for the server fetch: same progress messages, filtered to the range. */
export async function fetchDemo(args: {
  since: string;
  until: string;
  signal?: AbortSignal;
  onProgress?: (message: string) => void;
}): Promise<PullRequest[]> {
  args.onProgress?.("Searching merged pull requests…");
  await wait(700, args.signal);

  const from = Date.parse(`${args.since}T00:00:00Z`);
  const to = Date.parse(`${args.until}T23:59:59Z`);
  const prs = demoPullRequests().filter((pr) => {
    const t = Date.parse(pr.mergedAt);
    return t >= from && t <= to;
  });

  args.onProgress?.(`Found ${prs.length} pull requests`);
  await wait(500, args.signal);

  // Newest first, matching the order GitHub's search returns.
  return prs
    .sort((a, b) => b.mergedAt.localeCompare(a.mergedAt))
    .map(({ theme: _theme, change: _change, ...pr }) => pr);
}

function lookup(pr: PullRequest) {
  return DEMO_PRS[pr.id - 900_000];
}

const NOT_STATED = "_Not stated in the pull requests. Add the measured outcome._";

/**
 * Writes an entry from the period's PRs in the same STAR structure the real
 * prompt asks for, so it reads like model output at any granularity. Delayed a
 * little so the "Writing…" state is visible.
 */
export async function summariseDemo(bucket: Bucket, signal?: AbortSignal): Promise<string> {
  const hash = [...bucket.key].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  await wait(900 + (hash % 900), signal);

  const byTheme = new Map<ThemeId, DemoPr[]>();
  for (const pr of bucket.prs) {
    const demo = lookup(pr);
    if (!demo) continue;
    byTheme.set(demo.theme, [...(byTheme.get(demo.theme) ?? []), demo]);
  }

  // Biggest theme first; upkeep always last, since it is never the headline.
  const themes = [...byTheme.entries()].sort(
    ([a, x], [b, y]) => Number(a === "upkeep") - Number(b === "upkeep") || y.length - x.length,
  );

  const [first, second, ...rest] = themes.map(([id]) => THEMES[id].focus);
  let summary = `This period was mostly about ${first}`;
  summary += second ? `, alongside ${second}.` : ".";
  if (rest.length > 0) {
    const list = rest.length > 1 ? `${rest.slice(0, -1).join(", ")} and ${rest.at(-1)}` : rest[0];
    summary += ` It also covered ${list}.`;
  }
  if (themes.length === 1 && bucket.prs.length === 1)
    summary = `A quiet period, spent on ${first}.`;

  // A theme earns a STAR highlight when two or more of its PRs land together;
  // the rest is listed under Also shipped, as the real prompt asks.
  const highlighted = themes
    .filter(([id, prs]) => prs.length > 1 && "star" in THEMES[id])
    .slice(0, 3);
  const highlightedIds = new Set(highlighted.map(([id]) => id));

  const highlights = highlighted.map(([id, prs]) => {
    const star = (THEMES[id] as Theme).star!;
    // The first steps and the last one, as a model would condense a long run of PRs.
    const steps = [...prs].sort((a, b) => b.daysAgo - a.daysAgo).map((pr) => pr.change);
    const action = (steps.length > 3 ? [...steps.slice(0, 2), steps.at(-1)!] : steps).join(" ");
    const landed = star.resultPr !== undefined && prs.some((pr) => pr.number === star.resultPr);
    return [
      `### ${star.title}`,
      [
        `- **Situation:** ${star.situation}`,
        `- **Task:** ${star.task}`,
        `- **Action:** ${action}`,
        `- **Result:** ${landed && star.result ? star.result : NOT_STATED}`,
      ].join("\n"),
    ].join("\n\n");
  });

  const alsoShipped = themes
    .filter(([id]) => !highlightedIds.has(id))
    .flatMap(([, prs]) => prs.map((pr) => `- ${pr.change}`));

  return [
    entryHeader(bucket),
    "**Summary**",
    summary,
    ...(highlights.length > 0 ? ["**Highlights**", ...highlights] : []),
    ...(alsoShipped.length > 0 ? ["**Also shipped**", alsoShipped.join("\n")] : []),
    entryPullRequests(bucket),
  ].join("\n\n");
}
