"use client";

import type { Bucket } from "@/lib/types";
import { cacheKey } from "@/lib/summarise";
import { Markdown } from "./Markdown";

export function DiaryView(props: {
  buckets: Bucket[];
  entries: Record<string, string>;
  model: string;
  busyKeys: Set<string>;
  generating: boolean;
  hasOpenAiKey: boolean;
  onGenerateAll: () => void;
  onGenerateOne: (bucket: Bucket) => void;
  onExport: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const generatedCount = props.buckets.filter((b) => props.entries[cacheKey(b, props.model)]).length;

  return (
    <section className="panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-wide uppercase" style={{ color: "var(--muted)" }}>
          Diary · {props.buckets.length} period{props.buckets.length === 1 ? "" : "s"}
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn"
            onClick={props.onGenerateAll}
            disabled={props.generating || !props.hasOpenAiKey || props.buckets.length === 0}
          >
            {props.generating ? "Generating…" : generatedCount > 0 ? "Generate missing" : "Generate all"}
          </button>
          <button className="btn-ghost" onClick={props.onCopy} disabled={generatedCount === 0}>
            {props.copied ? "Copied" : "Copy markdown"}
          </button>
          <button className="btn-ghost" onClick={props.onExport} disabled={generatedCount === 0}>
            Export .md
          </button>
        </div>
      </div>

      {!props.hasOpenAiKey && (
        <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
          Add your OpenAI key above to generate entries. The pull requests below are already loaded.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {props.buckets.map((bucket) => {
          const entry = props.entries[cacheKey(bucket, props.model)];
          const busy = props.busyKeys.has(bucket.key);

          return (
            <article key={bucket.key} className="panel p-4" style={{ background: "var(--bg)" }}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-semibold">{bucket.label}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs" style={{ color: "var(--muted)" }}>
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
                <ul className="mt-2 space-y-1 text-xs" style={{ color: "var(--muted)" }}>
                  {bucket.prs.slice(0, 5).map((pr) => (
                    <li key={pr.id}>
                      <a href={pr.url} target="_blank" rel="noreferrer" style={{ color: "var(--accent)" }}>
                        {pr.repo}#{pr.number}
                      </a>{" "}
                      {pr.title}
                    </li>
                  ))}
                  {bucket.prs.length > 5 && <li>and {bucket.prs.length - 5} more…</li>}
                </ul>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
