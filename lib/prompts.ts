import type { Bucket } from "./types";

/** Keep prompt size predictable regardless of how verbose PR descriptions are. */
const MAX_BODY_CHARS = 1200;
const MAX_PRS_IN_PROMPT = 60;

export const SYSTEM_PROMPT = `You are an expert developer productivity assistant who writes developer diary entries on behalf of engineers, based on their merged GitHub pull requests.

You are given all the pull requests an engineer merged during a single time period, and you write ONE entry covering that whole period. You are not summarising pull requests one at a time; you are finding the through-line across them.

Guidelines:
- Write in first person, past tense, professional and concise. No filler, no praise, no restating the instructions.
- Group related pull requests into themes rather than listing them mechanically. Several PRs touching the same feature are one theme.
- Be specific and outcome-oriented. Prefer "cut the CI workflow runtime by moving install caching into a reusable action" over "made improvements to CI".
- Surface engineering decisions, trade-offs, refactors and migrations, because those are the things worth remembering later.
- Where a pull request implies a measurable result, say so. Never invent numbers, and never infer an outcome the pull request does not support.
- If the material is thin, write a short entry. Do not pad it.`;

function truncate(text: string, limit: number): string {
  const clean = text.replace(/\r/g, "").trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit)}\n…[truncated]`;
}

export function bucketPrompt(bucket: Bucket): string {
  const shown = bucket.prs.slice(0, MAX_PRS_IN_PROMPT);
  const omitted = bucket.prs.length - shown.length;

  const repos = [...new Set(bucket.prs.map((p) => p.repo))].filter(Boolean);

  const prBlocks = shown
    .map((pr) => {
      const body = pr.body ? truncate(pr.body, MAX_BODY_CHARS) : "(no description)";
      return [
        `### ${pr.repo}#${pr.number} — ${pr.title}`,
        `Merged: ${pr.mergedAt.slice(0, 10)}`,
        `URL: ${pr.url}`,
        `Description:`,
        body,
      ].join("\n");
    })
    .join("\n\n");

  return `Time period: ${bucket.label} (${bucket.start} to ${bucket.end})
Pull requests merged in this period: ${bucket.prs.length}${omitted > 0 ? ` (showing the ${shown.length} most recent)` : ""}
Repositories touched: ${repos.length > 0 ? repos.join(", ") : "unknown"}

${prBlocks}

---

Write the diary entry for this period using exactly this markdown structure, and output nothing else:

## ${bucket.label}

_${bucket.prs.length} pull request${bucket.prs.length === 1 ? "" : "s"} merged${repos.length > 0 ? ` · ${repos.join(", ")}` : ""}_

**Summary**

Two or three sentences on what this period was actually about.

**What changed**

A short bullet list of the themes, each bullet naming the concrete work and its outcome. Aim for three to six bullets; fewer if the period was quiet.

**Decisions and trade-offs**

A short bullet list of engineering decisions visible in these pull requests. Omit this heading entirely if the pull requests show none.

**Pull requests**

A bullet per pull request in the form: [repo#number](url) — title`;
}
