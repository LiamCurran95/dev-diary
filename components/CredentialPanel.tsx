"use client";

import { signIn, signOut } from "next-auth/react";

import { MODELS } from "@/lib/summarise";

export type AuthMode = "oauth" | "token";

type Viewer = { login: string; name: string | null };

export function CredentialPanel(props: {
  authMode: AuthMode;
  onAuthMode: (mode: AuthMode) => void;
  sessionLogin: string | null;
  sessionLoading: boolean;
  githubToken: string;
  onGithubToken: (v: string) => void;
  tokenViewer: Viewer | null;
  connecting: boolean;
  onConnect: () => void;
  openaiKey: string;
  onOpenaiKey: (v: string) => void;
  remember: boolean;
  onRemember: (v: boolean) => void;
  model: string;
  onModel: (v: string) => void;
}) {
  return (
    <section className="panel p-5">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2
              className="text-sm font-semibold tracking-wide uppercase"
              style={{ color: "var(--muted)" }}
            >
              GitHub
            </h2>
            <div className="flex gap-1">
              {(["oauth", "token"] as const).map((mode) => (
                <button
                  key={mode}
                  className="btn-ghost"
                  style={
                    props.authMode === mode
                      ? {
                          background: "var(--accent-soft)",
                          borderColor: "var(--accent)",
                          color: "var(--accent)",
                        }
                      : undefined
                  }
                  onClick={() => props.onAuthMode(mode)}
                >
                  {mode === "oauth" ? "Sign in" : "Paste a token"}
                </button>
              ))}
            </div>
          </div>

          {props.authMode === "oauth" ? (
            <div className="mt-3">
              {props.sessionLogin ? (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-sm" style={{ color: "var(--accent)" }}>
                    Signed in as @{props.sessionLogin}
                  </span>
                  <button className="btn-ghost" onClick={() => void signOut()}>
                    Sign out
                  </button>
                </div>
              ) : (
                <button
                  className="btn"
                  disabled={props.sessionLoading}
                  onClick={() => void signIn("github")}
                >
                  {props.sessionLoading ? "…" : "Sign in with GitHub"}
                </button>
              )}
              <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                Your GitHub token is held in an encrypted, http-only cookie and read only by this
                app&rsquo;s server when fetching. Page JavaScript never sees it.
              </p>
            </div>
          ) : (
            <div className="mt-3">
              <div className="flex gap-2">
                <input
                  className="field"
                  type="password"
                  autoComplete="off"
                  spellCheck={false}
                  placeholder="ghp_… (needs repo scope)"
                  value={props.githubToken}
                  onChange={(e) => props.onGithubToken(e.target.value)}
                />
                <button
                  className="btn whitespace-nowrap"
                  onClick={props.onConnect}
                  disabled={!props.githubToken || props.connecting}
                >
                  {props.connecting ? "…" : props.tokenViewer ? "Recheck" : "Connect"}
                </button>
              </div>
              {props.tokenViewer && (
                <p className="mt-1.5 text-xs" style={{ color: "var(--accent)" }}>
                  Connected as {props.tokenViewer.name ?? props.tokenViewer.login} (@
                  {props.tokenViewer.login})
                </p>
              )}
              <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
                No OAuth app needed. The token stays in this tab and goes straight to GitHub.
              </p>
            </div>
          )}
        </div>

        <div>
          <h2
            className="text-sm font-semibold tracking-wide uppercase"
            style={{ color: "var(--muted)" }}
          >
            OpenAI
          </h2>

          <div className="mt-3">
            <input
              className="field"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-…"
              value={props.openaiKey}
              onChange={(e) => props.onOpenaiKey(e.target.value)}
            />
            <label className="mt-2 flex items-center gap-1.5 text-xs">
              <span style={{ color: "var(--muted)" }}>Model</span>
              <select
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
            <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
              Held in this tab only and sent straight to OpenAI. It never reaches this
              app&rsquo;s server, so whoever hosts this cannot see it.
            </p>
          </div>
        </div>
      </div>

      <label className="mt-5 flex items-start gap-2 text-xs" style={{ color: "var(--muted)" }}>
        <input
          type="checkbox"
          className="mt-0.5"
          checked={props.remember}
          onChange={(e) => props.onRemember(e.target.checked)}
        />
        <span>
          Keep pasted keys in this tab only, so a refresh doesn&rsquo;t lose them. Uses{" "}
          <code>sessionStorage</code>, cleared when the tab closes. Off by default.
        </span>
      </label>
    </section>
  );
}
