import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const {
  GITHUB_TOKEN,
  GITHUB_USERNAME,
  OPENAI_API_KEY,
  OPENAI_ORG,
  OPENAI_PROJECT,
} = process.env;

if (
  !GITHUB_TOKEN ||
  !GITHUB_USERNAME ||
  !OPENAI_API_KEY ||
  !OPENAI_ORG ||
  !OPENAI_PROJECT
) {
  throw new Error("Missing required environment variables");
}

async function fetchPullRequests(): Promise<any[]> {
  const sinceDate = "2024-08-01";

  const query = `repo:LegitFit/legitfit author:${GITHUB_USERNAME} is:pr created:>=${sinceDate}`;

  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(
    query
  )}`;

  const response = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${GITHUB_TOKEN}`,
      "User-Agent": "dev-diary-script",
    },
  });

  return response.data.items;
}

async function summarizePR(title: string, body: string) {
  const openai = createOpenAI({
    apiKey: OPENAI_API_KEY,
    organization: OPENAI_ORG,
    project: OPENAI_PROJECT,
    compatibility: "strict", // strict mode, enable when using the OpenAI API
  });

  const model = openai("gpt-4o-mini");

  const prompt = `Title: ${title}\n\nDescription: ${body}\n\nWrite a concise developer diary entry summarizing what this PR was about and what was accomplished.`;

  const { text } = await generateText({
    model,
    prompt,
  });

  return text;
}

async function writeDiary(
  entries: { date: string; title: string; summary: string }[]
) {
  const content = entries
    .map(({ date, title, summary }) => `### ${date} - ${title}\n\n${summary}\n`)
    .join("\n");

  fs.writeFileSync("developer-diary.md", content);
  console.log("📘 Developer diary saved to developer-diary.md");
}

async function main() {
  console.log("📥 Fetching pull requests...");
  const prs = await fetchPullRequests();

  const entries: { date: string; title: string; summary: string }[] = [];

  // for (const pr of prs) {
  const pr = prs[0];
  const title = pr.title;
  const body = pr.body || "";
  const date = new Date(pr.created_at).toISOString().split("T")[0];

  console.log(`🧠 Summarizing PR: ${title}`);
  const summary = await summarizePR(title, body);

  entries.push({ date, title, summary });
  // }

  await writeDiary(entries);
}

main().catch(console.error);
