import { describe, expect, it } from "vitest";

import { groupIntoBuckets, windowFor } from "../buckets";
import type { PullRequest } from "../types";

function pr(id: number, mergedAt: string): PullRequest {
  return {
    id,
    number: id,
    title: `PR ${id}`,
    body: "",
    url: `https://example.com/${id}`,
    repo: "owner/repo",
    mergedAt,
  };
}

describe("windowFor", () => {
  it("puts a date in its own day bucket", () => {
    const w = windowFor(new Date("2026-03-11T14:00:00Z"), "day");
    expect(w.key).toBe("2026-03-11");
    expect(w.start.toISOString().slice(0, 10)).toBe("2026-03-11");
    expect(w.end.toISOString().slice(0, 10)).toBe("2026-03-11");
  });

  it("starts weeks on Monday", () => {
    // 2026-03-11 is a Wednesday.
    const w = windowFor(new Date("2026-03-11T14:00:00Z"), "week");
    expect(w.start.toISOString().slice(0, 10)).toBe("2026-03-09");
    expect(w.end.toISOString().slice(0, 10)).toBe("2026-03-15");
  });

  it("keeps a Sunday in the week that began the previous Monday", () => {
    // 2026-03-15 is a Sunday.
    const w = windowFor(new Date("2026-03-15T23:59:00Z"), "week");
    expect(w.start.toISOString().slice(0, 10)).toBe("2026-03-09");
  });

  it("spans fourteen days for a fortnight", () => {
    const w = windowFor(new Date("2026-03-11T14:00:00Z"), "fortnight");
    const days = (w.end.getTime() - w.start.getTime()) / 86_400_000 + 1;
    expect(days).toBe(14);
    expect(w.start.getUTCDay()).toBe(1); // Monday
  });

  it("covers a whole calendar month", () => {
    const w = windowFor(new Date("2026-02-17T00:00:00Z"), "month");
    expect(w.key).toBe("2026-02");
    expect(w.start.toISOString().slice(0, 10)).toBe("2026-02-01");
    expect(w.end.toISOString().slice(0, 10)).toBe("2026-02-28");
  });

  it("covers a whole quarter", () => {
    const w = windowFor(new Date("2026-08-05T00:00:00Z"), "quarter");
    expect(w.key).toBe("2026-Q3");
    expect(w.start.toISOString().slice(0, 10)).toBe("2026-07-01");
    expect(w.end.toISOString().slice(0, 10)).toBe("2026-09-30");
  });

  it("does not drift for a late-evening UTC timestamp", () => {
    const w = windowFor(new Date("2026-03-11T23:59:59Z"), "day");
    expect(w.key).toBe("2026-03-11");
  });
});

describe("groupIntoBuckets", () => {
  const prs = [
    pr(1, "2026-03-02T10:00:00Z"),
    pr(2, "2026-03-04T10:00:00Z"),
    pr(3, "2026-03-19T10:00:00Z"),
    pr(4, "2026-05-01T10:00:00Z"),
  ];

  it("collapses a month into one bucket", () => {
    const buckets = groupIntoBuckets(prs, "month");
    expect(buckets.map((b) => b.key)).toEqual(["2026-05", "2026-03"]);
    expect(buckets[1].prs).toHaveLength(3);
  });

  it("splits the same PRs across weeks", () => {
    const buckets = groupIntoBuckets(prs, "week");
    expect(buckets).toHaveLength(3);
    expect(buckets[0].start > buckets[1].start).toBe(true);
  });

  it("sorts newest bucket first and newest PR first within a bucket", () => {
    const buckets = groupIntoBuckets(prs, "month");
    expect(buckets[0].key).toBe("2026-05");
    expect(buckets[1].prs[0].id).toBe(3);
  });

  it("ignores pull requests with no merge date", () => {
    const buckets = groupIntoBuckets([...prs, pr(5, "")], "month");
    expect(buckets.flatMap((b) => b.prs)).toHaveLength(4);
  });

  it("returns nothing for no input", () => {
    expect(groupIntoBuckets([], "week")).toEqual([]);
  });
});
