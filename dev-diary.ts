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

type PullRequest = {
  title: string;
  number: number;
  body: string;
  pull_request: {
    html_url: string;
  };
  closed_at: Date;
};

const system = `You are an expert AI developer productivity assistant.
Your task is to automatically generate high-quality daily development diary entries on behalf of engineers, based on GitHub Pull Requests.

Your tone should be professional and concise.

Your goal is to create clear, structured, and insightful summaries of a developer’s day. These entries should reflect what was worked on, key decisions made, blockers encountered, and progress toward larger goals. The diary is both a personal log and a communication tool for managers, teammates, and future reference.

You will be given input from a developer in the form of a pull request. Based on that, generate a structured developer diary entry using the schema below.

Key guidelines:
- Each diary entry represents a single workday for one developer.
- The entry should be structured into logical sections
- Each section should be specific, outcome-oriented, and free of fluff.

When input is minimal or vague, apply sensible defaults based on best practices in software development (e.g., common workflows, agile processes, modern engineering tools).
`;

const fetchPullRequests = async (): Promise<PullRequest[]> => {
  const sinceDate = "2024-08-01";

  const query = `repo:LegitFit/legitfit author:${GITHUB_USERNAME} is:pr is:merged created:>=${sinceDate}`;

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
};

const writeDiary = async (entries: string[]) => {
  const content = entries.join("\n\n\n");

  fs.writeFileSync("developer-diary.md", content);
  console.log("📘 Developer diary saved to developer-diary.md");
};

const summarisePR = async (pr: PullRequest) => {
  const openai = createOpenAI({
    apiKey: OPENAI_API_KEY,
    organization: OPENAI_ORG,
    project: OPENAI_PROJECT,
    compatibility: "strict", // strict mode, enable when using the OpenAI API
  });

  const model = openai("gpt-4.1", {
    structuredOutputs: true,
  });

  const prompt = `
Given the following pull request data:
- Title: ${pr.title}
- Body: ${pr.body}
- PR Number: ${pr.number}
- URL: ${pr.pull_request.html_url}
- Closed At: ${pr.closed_at}

Write a well-structured and concise Developer Diary entry using this format:

---
### 📝 {{title}} - 📅 {{closed_at | date: "%Y-%m-%d"}}

**🔗 PR:** [#{{pull_request_number}}]({{pull_request_url}})  

**🔍 Summary:**  
Summarize the purpose of the pull request in 1–2 sentences using natural, clear language.

**📌 Details:**  
Expand on what was done and why. Use any clues from the content field to add more context, like what was improved, fixed, or refactored.

**⚙️ Performance:**  
Mention any notable performance metrics if implied by the content.

Respond with only the structured diary entry, no explanation or additional commentary.

---

`;

  const { text } = await generateText({ model, prompt, system });

  return text;
};

async function main() {
  const prs = await fetchPullRequests();

  const entries: string[] = [];

  const prsA = prs.slice(0, 3);
  for (const pr of prsA) {
    const summary = await summarisePR(pr);

    entries.push(summary);
  }

  await writeDiary(entries);
}

main().catch(console.error);
