"use client";

import { MODELS } from "@/lib/summarise";

type Viewer = { login: string; name: string | null };

export function CredentialPanel(props: {
  githubToken: string;
  onGithubToken: (v: string) => void;
  openaiKey: string;
  onOpenaiKey: (v: string) => void;
  remember: boolean;
  onRemember: (v: boolean) => void;
  model: string;
  onModel: (v: string) => void;
  viewer: Viewer | null;
  connecting: boolean;
  onConnect: () => void;
}) {
  return (
    <section className="panel p-5">
      <h2 className="text-sm font-semibold tracking-wide uppercase" style={{ color: "var(--muted)" }}>
        Credentials
      </h2>

      <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
        Both keys stay in this browser tab and are sent only to GitHub and OpenAI directly. They are
        never written to disk, never placed in a cookie, and never reach this site&rsquo;s server —
        there is no server involved in the calls that use them.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="gh-token">
            GitHub token <span style={{ color: "var(--muted)" }}>(needs repo scope)</span>
          </label>
          <div className="flex gap-2">
            <input
              id="gh-token"
              className="field"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="ghp_… or gho_…"
              value={props.githubToken}
              onChange={(e) => props.onGithubToken(e.target.value)}
            />
            <button
              className="btn whitespace-nowrap"
              onClick={props.onConnect}
              disabled={!props.githubToken || props.connecting}
            >
              {props.connecting ? "…" : props.viewer ? "Recheck" : "Connect"}
            </button>
          </div>
          {props.viewer && (
            <p className="mt-1.5 text-xs" style={{ color: "var(--accent)" }}>
              Connected as {props.viewer.name ?? props.viewer.login} (@{props.viewer.login})
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" htmlFor="openai-key">
            OpenAI API key
          </label>
          <input
            id="openai-key"
            className="field"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-…"
            value={props.openaiKey}
            onChange={(e) => props.onOpenaiKey(e.target.value)}
          />
          <label className="mt-1.5 flex items-center gap-1.5 text-xs" htmlFor="model">
            <span style={{ color: "var(--muted)" }}>Model</span>
            <select
              id="model"
              className="field"
              style={{ padding: "0.2rem 0.4rem", width: "auto" }}
              value={props.model}
              onChange={(e) => props.onModel(e.target.value)}
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <label className="mt-4 flex items-start gap-2 text-xs" style={{ color: "var(--muted)" }}>
        <input
          type="checkbox"
          className="mt-0.5"
          checked={props.remember}
          onChange={(e) => props.onRemember(e.target.checked)}
        />
        <span>
          Keep these in this tab only, so a refresh doesn&rsquo;t lose them. Uses{" "}
          <code>sessionStorage</code>, which is cleared when you close the tab. Leave it off and the
          keys live in memory alone.
        </span>
      </label>
    </section>
  );
}
