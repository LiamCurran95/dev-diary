"use client";

import { Button, InlineLoading, Tag, Tile } from "@carbon/react";

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
  canGenerate: boolean;
  onGenerateAll: () => void;
  onGenerateOne: (bucket: Bucket) => void;
  onCancelGenerate: () => void;
  onExport: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const generated = props.buckets.filter((b) => props.entries[cacheKey(b, props.model)]).length;
  const pending = props.buckets.length - generated;

  return (
    <Tile className="panel">
      <div className="row row--between">
        <TimeframeSelector
          value={props.granularity}
          onChange={props.onGranularity}
          disabled={props.generating}
        />

        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          {props.generating ? (
            <Button kind="danger--tertiary" onClick={props.onCancelGenerate}>
              Stop
            </Button>
          ) : (
            <Button onClick={props.onGenerateAll} disabled={!props.canGenerate || pending === 0}>
              {generated > 0 ? `Generate ${pending} remaining` : "Generate all"}
            </Button>
          )}
          <Button kind="tertiary" onClick={props.onCopy} disabled={generated === 0}>
            {props.copied ? "Copied" : "Copy"}
          </Button>
          <Button kind="tertiary" onClick={props.onExport} disabled={generated === 0}>
            Export .md
          </Button>
        </div>
      </div>

      <p className="muted" style={{ marginTop: "1rem", fontSize: "0.75rem" }}>
        {props.prCount} pull request{props.prCount === 1 ? "" : "s"} across {props.buckets.length}{" "}
        period{props.buckets.length === 1 ? "" : "s"}
        {generated > 0 && ` · ${generated} written`}
        {!props.canGenerate && " · add an API key above to generate entries"}
      </p>

      <div className="stack" style={{ marginTop: "1.5rem" }}>
        {props.buckets.map((bucket) => {
          const entry = props.entries[cacheKey(bucket, props.model)];
          const busy = props.busyKeys.has(bucket.key);

          return (
            <Tile key={bucket.key} className="panel--nested">
              <div className="row row--between">
                <h3 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{bucket.label}</h3>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <Tag type="cool-gray">
                    {bucket.prs.length} PR{bucket.prs.length === 1 ? "" : "s"}
                  </Tag>
                  {busy ? (
                    <InlineLoading description="Writing…" status="active" />
                  ) : (
                    <Button
                      kind="ghost"
                      size="sm"
                      onClick={() => props.onGenerateOne(bucket)}
                      disabled={!props.canGenerate || props.generating}
                    >
                      {entry ? "Regenerate" : "Generate"}
                    </Button>
                  )}
                </div>
              </div>

              {entry ? (
                <div className="markdown" style={{ marginTop: "1rem" }}>
                  <Markdown>{entry}</Markdown>
                </div>
              ) : (
                <ul className="muted" style={{ marginTop: "0.75rem", fontSize: "0.75rem" }}>
                  {bucket.prs.slice(0, 4).map((pr) => (
                    <li key={pr.id} style={{ margin: "0.25rem 0" }}>
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noreferrer"
                        style={{ color: "var(--cds-link-primary)" }}
                      >
                        {pr.repo}#{pr.number}
                      </a>{" "}
                      {pr.title}
                    </li>
                  ))}
                  {bucket.prs.length > 4 && (
                    <li style={{ margin: "0.25rem 0" }}>and {bucket.prs.length - 4} more…</li>
                  )}
                </ul>
              )}
            </Tile>
          );
        })}
      </div>
    </Tile>
  );
}
