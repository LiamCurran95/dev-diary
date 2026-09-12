/**
 * CLI version of the dev diary. Shares the fetching, bucketing and prompting
 * logic with the web app in ../lib, so fixes land in both.
 *
 * Configure via .env, then: npm run dev-diary
 */
import fs from "node:fs";

import dotenv from "dotenv";

import { groupIntoBuckets } from "../lib/buckets";
import { fetchMergedPullRequests, getViewer } from "../lib/github";
import { summariseBucket } from "../lib/summarise";
import type { Granularity } from "../lib/types";

dotenv.config();

const {
  GITHUB_TOKEN,
  OPENAI_API_KEY,
  SCOPE = "",
  SINCE_DATE,
  UNTIL_DATE,
  GRANULARITY = "month",
  MODEL = "gpt-4.1-mini",
  OUTPUT = "developer-diary.md",
} = process.env;

if (!GITHUB_TOKEN || !OPENAI_API_KEY || !SINCE_DATE) {
  throw new Error("Missing required environment variables: GITHUB_TOKEN, OPENAI_API_KEY, SINCE_DATE");
}

const granularity = GRANULARITY as Granularity;

async function main(): Promise<void> {
  const viewer = await getViewer(GITHUB_TOKEN!);
  console.log(`Signed in as ${viewer.login}`);

  const prs = await fetchMergedPullRequests({
    token: GITHUB_TOKEN!,
    login: viewer.login,
    since: SINCE_DATE!,
    until: UNTIL_DATE ?? new Date().toISOString().slice(0, 10),
    scope: SCOPE,
    onProgress: (m) => console.log(`  ${m}`),
  });

  const buckets = groupIntoBuckets(prs, granularity);
  console.log(`Grouped into ${buckets.length} ${granularity} buckets. Summarising…`);

  const sections: string[] = [];
  for (const bucket of buckets) {
    console.log(`  ${bucket.label} (${bucket.prs.length} PRs)`);
    sections.push(
      await summariseBucket({ apiKey: OPENAI_API_KEY!, model: MODEL, bucket }),
    );
  }

  const output = [
    "# Developer diary",
    `_${viewer.login} · ${SINCE_DATE} onwards · grouped ${granularity}_`,
    ...sections,
  ].join("\n\n---\n\n");

  fs.writeFileSync(OUTPUT, `${output}\n`);
  console.log(`Saved ${buckets.length} entries to ${OUTPUT}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
