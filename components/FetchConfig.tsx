"use client";

import { Button, InlineLoading, TextInput, Tile } from "@carbon/react";

export function FetchConfig(props: {
  since: string;
  onSince: (v: string) => void;
  until: string;
  onUntil: (v: string) => void;
  scope: string;
  onScope: (v: string) => void;
  fetching: boolean;
  progress: string;
  canFetch: boolean;
  signedIn: boolean;
  onFetch: () => void;
  onCancel: () => void;
  prCount: number | null;
}) {
  return (
    <Tile className="panel">
      <p className="section-label">Range</p>

      <div className="row">
        <div style={{ flex: "1 1 9rem" }}>
          <TextInput
            id="since"
            type="date"
            labelText="From"
            value={props.since}
            onChange={(e) => props.onSince(e.target.value)}
          />
        </div>
        <div style={{ flex: "1 1 9rem" }}>
          <TextInput
            id="until"
            type="date"
            labelText="To"
            value={props.until}
            onChange={(e) => props.onUntil(e.target.value)}
          />
        </div>
        <div style={{ flex: "2 1 16rem" }}>
          <TextInput
            id="scope"
            labelText="Limit to (optional)"
            placeholder="org:my-org  or  repo:owner/name"
            value={props.scope}
            onChange={(e) => props.onScope(e.target.value)}
          />
        </div>

        {props.fetching ? (
          <Button kind="danger--tertiary" onClick={props.onCancel}>
            Cancel
          </Button>
        ) : (
          <Button onClick={props.onFetch} disabled={!props.canFetch}>
            Fetch
          </Button>
        )}
      </div>

      <div style={{ marginTop: "1rem" }}>
        {props.fetching ? (
          <InlineLoading description={props.progress || "Fetching…"} status="active" />
        ) : (
          <p className="muted" style={{ fontSize: "0.75rem" }}>
            {!props.signedIn
              ? "Sign in with GitHub to fetch your merged pull requests."
              : props.prCount !== null
                ? `${props.prCount} loaded. Re-chunking below is instant — no refetch needed.`
                : "Fetches every merged pull request you authored in this range."}
          </p>
        )}
      </div>
    </Tile>
  );
}
