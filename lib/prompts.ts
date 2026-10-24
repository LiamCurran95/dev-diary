import type { Bucket } from "./types";

/**
 * Keep prompt size predictable regardless of how verbose PR descriptions are.
 * Descriptions share one budget, so a quiet period sends each in full (the
 * figures that make a good Result are often near the end) and a busy one
 * trims them all.
 */
const DESCRIPTION_BUDGET_CHARS = 24_000;
const MIN_BODY_CHARS = 800;
const MAX_BODY_CHARS = 4_000;
const MAX_PRS_IN_PROMPT = 60;

export function bodyLimit(prCount: number): number {
  const share = Math.floor(DESCRIPTION_BUDGET_CHARS / Math.max(prCount, 1));
  return Math.min(MAX_BODY_CHARS, Math.max(MIN_BODY_CHARS, share));
}

export const SYSTEM_PROMPT = `You are an expert developer productivity assistant who writes developer diary entries on behalf of engineers, based on their merged GitHub pull requests. The entries feed performance reviews, promotion cases and CVs, so they are written in STAR form (Situation, Task, Action, Result) wherever the material supports it.

You are given all the pull requests an engineer merged during a single time period, and you write ONE entry covering that whole period. You are not summarising pull requests one at a time; you are finding the through-line across them.

Guidelines:
- Write in first person, past tense, professional and concise. No filler, no praise, no restating the instructions.
- Group related pull requests into themes rather than listing them mechanically. Several PRs touching the same feature are one theme.
- Write each substantial theme as a STAR highlight:
  - Situation: the problem, constraint or context that prompted the work, as the pull requests describe it. A situation that only restates the task ("the project needed CI") is not evidence of one.
  - Task: what I set out to achieve.
  - Action: what I actually did, specifically, including the engineering decisions and trade-offs visible in the pull requests. When a pull request backs a decision with figures ("9 kB instead of 90 kB", "two minutes instead of ten"), include them; they are often the strongest evidence in the entry.
  - Result: an outcome beyond the work itself: a measured change, a problem that went away, a capability users or the team gained, or something removed or replaced. Use any figures the pull requests give, such as sizes, timings, test counts or tickets resolved, and quote them exactly.
- Every STAR line must be supported by the pull requests. Never invent numbers, motivations or outcomes.
- A result that only says the work exists ("the repository had a CI workflow", "the feature was added") restates the action. In that case write exactly: _Not stated in the pull requests. Add the measured outcome._ A flagged gap is more useful to the reader than a result that says nothing.
- If there is no evidence for a situation, do not write a highlight. List the work under "Also shipped" instead.
- A pull request with no description still counts. Describe it from its title under "Also shipped", without guessing at details the title does not give.
- Be specific and outcome-oriented. Prefer "cut the CI workflow runtime by moving install caching into a reusable action" over "made improvements to CI".
- Write for a reader who does not know the codebase, such as a manager or an interviewer. Name technologies and patterns, but leave out internal function names, file paths and config keys unless the work is about them.
- Leave out housekeeping that says nothing about the engineer's work, unless it is all the period contains. That includes formatting fixes, .gitignore edits, favicon changes, configuration for local editors or AI coding assistants (such as .vscode, .cursor or .claude settings), and ticket or status bookkeeping such as marking a task done. This holds even when the pull request explains its reasoning well. Leave it out of the summary too.
- Scale the entry to the amount of work. A single pull request usually warrants one STAR highlight and little else. If the material is thin, write a short entry, and do not repeat the summary under "Also shipped".`;

/**
 * The parts of an entry that follow mechanically from the bucket. They are
 * added in code rather than asked of the model, so they are always accurate
 * and cost no output tokens.
 */
export function entryHeader(bucket: Bucket): string {
  const n = bucket.prs.length;
  const repos = [...new Set(bucket.prs.map((p) => p.repo))].filter(Boolean);
  return [
    `## ${bucket.label}`,
    `_${n} pull request${n === 1 ? "" : "s"} merged${repos.length > 0 ? ` · ${repos.join(", ")}` : ""}_`,
  ].join("\n\n");
}

export function entryPullRequests(bucket: Bucket): string {
  const lines = [...bucket.prs]
    .sort((a, b) => a.mergedAt.localeCompare(b.mergedAt))
    .map((pr) => `- [${pr.repo}#${pr.number}](${pr.url}) — ${pr.title}`);
  return ["**Pull requests**", lines.join("\n")].join("\n\n");
}

function truncate(text: string, limit: number): string {
  const clean = text.replace(/\r/g, "").trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit)}\n…[truncated]`;
}

export function bucketPrompt(bucket: Bucket): string {
  const shown = bucket.prs.slice(0, MAX_PRS_IN_PROMPT);
  const omitted = bucket.prs.length - shown.length;

  const repos = [...new Set(bucket.prs.map((p) => p.repo))].filter(Boolean);

  const limit = bodyLimit(shown.length);
  const prBlocks = shown
    .map((pr) => {
      const body = pr.body ? truncate(pr.body, limit) : "(no description)";
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

Write the body of the diary entry for this period using exactly this markdown structure, and output nothing else. The period heading and the list of pull requests are added separately, so do not include them.

**Summary**

Two or three sentences on what this period was actually about. One sentence if the period was quiet.

**Highlights**

One STAR block per substantial theme, most significant first, at most three. Each block is a level-three heading naming the theme, then four bullets:

### <Theme, in a few words>

- **Situation:** …
- **Task:** …
- **Action:** …
- **Result:** …

Omit this heading entirely if no theme has enough material for a STAR block.

**Also shipped**

A short bullet list of smaller work that does not warrant a STAR block, each naming the concrete change. Omit this heading entirely if there is none.`;
}
