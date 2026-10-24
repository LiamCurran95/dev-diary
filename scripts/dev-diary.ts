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
import { detectProvider, listModels, pickDefaultModel, providerLabel } from "../lib/providers";
import { summariseBucket } from "../lib/summarise";
import type { Granularity } from "../lib/types";

dotenv.config();

const {
  GITHUB_TOKEN,
  AI_API_KEY,
  OPENAI_API_KEY,
  SCOPE = "",
  SINCE_DATE,
  UNTIL_DATE,
  GRANULARITY = "month",
  MODEL,
  OUTPUT = "developer-diary.md",
} = process.env;

// OPENAI_API_KEY is accepted for continuity with the original script.
const apiKey = AI_API_KEY ?? OPENAI_API_KEY;

if (!GITHUB_TOKEN || !apiKey || !SINCE_DATE) {
  throw new Error("Missing required environment variables: GITHUB_TOKEN, AI_API_KEY, SINCE_DATE");
}

const provider = detectProvider(apiKey);
if (!provider) {
  throw new Error("AI_API_KEY is not a recognised key. Expected one starting sk- or sk-ant-.");
}

const granularity = GRANULARITY as Granularity;

async function main(): Promise<void> {
  const viewer = await getViewer(GITHUB_TOKEN!);
  console.log(`Signed in as ${viewer.login}`);

  let model = MODEL;
  if (!model) {
    const available = await listModels(provider!, apiKey!);
    model = pickDefaultModel(provider!, available, "");
    if (!model) throw new Error("That key has no usable text models.");
  }
  console.log(`Using ${providerLabel(provider!)} · ${model}`);

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
      await summariseBucket({ provider: provider!, apiKey: apiKey!, model, bucket }),
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
