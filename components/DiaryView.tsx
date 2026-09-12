"use client";

import { cacheKey } from "@/lib/summarise";
import type { Bucket, Granularity } from "@/lib/types";

import { Markdown } from "./Markdown";
import { TimeframeSelector } from "./TimeframeSelector";

export function DiaryView(props: {
  buckets: Bucket[];
  prCount: number;
  entries: Record<string, string>;
  model: string;
  granularity: Granularity;
  onGranularity: (g: Granularity) => void;
  busyKeys: Set<string>;
  generating: boolean;
  hasOpenAiKey: boolean;
  onGenerateAll: () => void;
  onGenerateOne: (bucket: Bucket) => void;
  onExport: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const generated = props.buckets.filter((b) => props.entries[cacheKey(b, props.model)]).length;
  const pending = props.buckets.length - generated;

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TimeframeSelector
          value={props.granularity}
          onChange={props.onGranularity}
          disabled={props.generating}
        />

        <div className="flex flex-wrap gap-2">
          <button
            className="btn"
            onClick={props.onGenerateAll}
            disabled={props.generating || !props.hasOpenAiKey || pending === 0}
          >
            {props.generating
              ? "Generating…"
              : generated > 0
                ? `Generate ${pending} remaining`
                : "Generate all"}
          </button>
          <button className="btn-ghost" onClick={props.onCopy} disabled={generated === 0}>
            {props.copied ? "Copied" : "Copy"}
          </button>
          <button className="btn-ghost" onClick={props.onExport} disabled={generated === 0}>
            Export .md
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs muted">
        {props.prCount} pull request{props.prCount === 1 ? "" : "s"} across {props.buckets.length}{" "}
        period{props.buckets.length === 1 ? "" : "s"}
        {generated > 0 && ` · ${generated} written`}
        {!props.hasOpenAiKey && " · add an OpenAI key above to generate entries"}
      </p>

      <div className="mt-4 space-y-3">
        {props.buckets.map((bucket) => {
          const entry = props.entries[cacheKey(bucket, props.model)];
          const busy = props.busyKeys.has(bucket.key);

          return (
            <article key={bucket.key} className="panel p-4" style={{ background: "var(--bg)" }}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{bucket.label}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs muted">
                    {bucket.prs.length} PR{bucket.prs.length === 1 ? "" : "s"}
                  </span>
                  <button
                    className="btn-ghost"
                    onClick={() => props.onGenerateOne(bucket)}
                    disabled={busy || !props.hasOpenAiKey}
                  >
                    {busy ? "…" : entry ? "Regenerate" : "Generate"}
                  </button>
                </div>
              </div>

              {entry ? (
                <div className="mt-3">
                  <Markdown>{entry}</Markdown>
                </div>
              ) : (
                <ul className="mt-2 space-y-1 text-xs muted">
                  {bucket.prs.slice(0, 4).map((pr) => (
                    <li key={pr.id}>
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--accent)" }}
                      >
                        {pr.repo}#{pr.number}
                      </a>{" "}
                      {pr.title}
                    </li>
                  ))}
                  {bucket.prs.length > 4 && <li>and {bucket.prs.length - 4} more…</li>}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
