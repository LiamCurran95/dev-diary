import { afterEach, describe, expect, it, vi } from "vitest";

import { bodyLimit } from "../prompts";
import { summariseBucket } from "../summarise";
import type { Bucket } from "../types";

const bucket: Bucket = {
  key: "2026-10",
  label: "October 2026",
  start: "2026-10-01",
  end: "2026-10-31",
  prs: [
    {
      id: 2,
      number: 18,
      title: "feat: monorepo foundations",
      body: "",
      url: "https://github.com/owner/repo/pull/18",
      repo: "owner/repo",
      mergedAt: "2026-10-11T10:00:00Z",
    },
    {
      id: 1,
      number: 17,
      title: "feat: theme config",
      body: "",
      url: "https://github.com/owner/repo/pull/17",
      repo: "owner/repo",
      mergedAt: "2026-10-02T10:00:00Z",
    },
  ],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("summariseBucket", () => {
  it("wraps the model's body in a heading and a PR list built from the bucket", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ choices: [{ message: { content: "**Summary**\n\nBody." } }] }),
      ),
    );

    const entry = await summariseBucket({ provider: "openai", apiKey: "test", model: "m", bucket });

    expect(entry).toBe(
      [
        "## October 2026",
        "_2 pull requests merged · owner/repo_",
        "**Summary**\n\nBody.",
        "**Pull requests**",
        "- [owner/repo#17](https://github.com/owner/repo/pull/17) — feat: theme config\n" +
          "- [owner/repo#18](https://github.com/owner/repo/pull/18) — feat: monorepo foundations",
      ].join("\n\n"),
    );
  });
});

describe("bodyLimit", () => {
  it("sends descriptions in full when a period is quiet", () => {
    expect(bodyLimit(1)).toBe(4_000);
    expect(bodyLimit(3)).toBe(4_000);
  });

  it("shares the budget when a period is busy, down to a floor", () => {
    expect(bodyLimit(12)).toBe(2_000);
    expect(bodyLimit(60)).toBe(800);
  });
});
