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
  onFetch: () => void;
  onCancel: () => void;
  prCount: number | null;
}) {
  return (
    <section className="panel p-5">
      <h2 className="text-sm font-semibold tracking-wide uppercase" style={{ color: "var(--muted)" }}>
        Range
      </h2>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_2fr_auto] sm:items-end">
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="since">From</label>
          <input id="since" className="field" type="date" value={props.since} onChange={(e) => props.onSince(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="until">To</label>
          <input id="until" className="field" type="date" value={props.until} onChange={(e) => props.onUntil(e.target.value)} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="scope">
            Limit to <span style={{ color: "var(--muted)" }}>(optional)</span>
          </label>
          <input
            id="scope"
            className="field"
            placeholder="org:legitfit  or  repo:owner/name"
            value={props.scope}
            onChange={(e) => props.onScope(e.target.value)}
          />
        </div>
        {props.fetching ? (
          <button className="btn-ghost" onClick={props.onCancel}>Cancel</button>
        ) : (
          <button className="btn" onClick={props.onFetch} disabled={!props.canFetch}>
            Fetch PRs
          </button>
        )}
      </div>

      {(props.progress || props.prCount !== null) && (
        <p className="mt-3 text-xs" style={{ color: "var(--muted)" }}>
          {props.fetching ? props.progress : `${props.prCount} merged pull requests loaded. Re-chunking below is instant — no refetch needed.`}
        </p>
      )}
    </section>
  );
}
