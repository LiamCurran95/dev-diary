import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { groupIntoBuckets } from "../buckets";
import { fetchDemo, summariseDemo } from "../demo";

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-24T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

async function run<T>(promise: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return promise;
}

describe("fetchDemo", () => {
  it("returns the sample pull requests inside the range, newest first", async () => {
    const prs = await run(fetchDemo({ since: "2026-09-01", until: "2026-10-24" }));
    expect(prs.length).toBeGreaterThan(0);
    for (const pr of prs) {
      expect(pr.mergedAt >= "2026-09-01").toBe(true);
      expect(pr.url.startsWith("https://example.com/")).toBe(true);
    }
    const dates = prs.map((p) => p.mergedAt);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it("reports progress the way the real fetch does", async () => {
    const messages: string[] = [];
    await run(
      fetchDemo({ since: "2025-10-24", until: "2026-10-24", onProgress: (m) => messages.push(m) }),
    );
    expect(messages.at(-1)).toMatch(/^Found \d+ pull requests$/);
  });
});

describe("summariseDemo", () => {
  it("writes an entry in the same structure the real prompt asks for", async () => {
    const prs = await run(fetchDemo({ since: "2025-10-24", until: "2026-10-24" }));
    const [bucket] = groupIntoBuckets(prs, "quarter");
    const entry = await run(summariseDemo(bucket));

    expect(entry.startsWith(`## ${bucket.label}`)).toBe(true);
    expect(entry).toContain("**Summary**");
    expect(entry).toContain("**Highlights**");
    expect(entry).toContain("- **Situation:**");
    expect(entry).toContain("- **Result:**");
    expect(entry).toContain("**Pull requests**");
    for (const pr of bucket.prs) expect(entry).toContain(`${pr.repo}#${pr.number}`);
  });

  it("flags a missing result instead of inventing one", async () => {
    const prs = await run(fetchDemo({ since: "2025-10-24", until: "2026-10-24" }));
    const q3 = groupIntoBuckets(prs, "quarter").find((b) => b.label === "Q3 2026")!;
    const entry = await run(summariseDemo(q3));

    expect(entry).toContain("### A lighter product page");
    expect(entry).toContain("_Not stated in the pull requests. Add the measured outcome._");
  });

  it("stops when aborted", async () => {
    const prs = await run(fetchDemo({ since: "2025-10-24", until: "2026-10-24" }));
    const controller = new AbortController();
    const pending = summariseDemo(groupIntoBuckets(prs, "month")[0], controller.signal);
    controller.abort();
    await expect(pending).rejects.toThrow(/abort/i);
  });
});
