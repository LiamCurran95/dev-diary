"use client";

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
    <section className="panel p-5">
      <h2 className="label">Range</h2>

      <div className="mt-2.5 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
        <div>
          <label className="block text-xs mb-1 muted" htmlFor="since">
            From
          </label>
          <input
            id="since"
            className="field"
            type="date"
            value={props.since}
            onChange={(e) => props.onSince(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs mb-1 muted" htmlFor="until">
            To
          </label>
          <input
            id="until"
            className="field"
            type="date"
            value={props.until}
            onChange={(e) => props.onUntil(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs mb-1 muted" htmlFor="scope">
            Limit to (optional)
          </label>
          <input
            id="scope"
            className="field"
            placeholder="org:my-org  or  repo:owner/name"
            value={props.scope}
            onChange={(e) => props.onScope(e.target.value)}
          />
        </div>
        {props.fetching ? (
          <button className="btn-ghost" onClick={props.onCancel}>
            Cancel
          </button>
        ) : (
          <button className="btn" onClick={props.onFetch} disabled={!props.canFetch}>
            Fetch
          </button>
        )}
      </div>

      <p className="mt-3 text-xs muted">
        {props.fetching
          ? props.progress
          : !props.signedIn
            ? "Sign in with GitHub to fetch your merged pull requests."
            : props.prCount !== null
              ? `${props.prCount} loaded. Re-chunking below is instant — no refetch needed.`
              : "Fetches every merged pull request you authored in this range."}
      </p>
    </section>
  );
}
