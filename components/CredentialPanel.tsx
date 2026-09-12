"use client";

import { signIn, signOut } from "next-auth/react";

import { MODELS } from "@/lib/summarise";

export function CredentialPanel(props: {
  sessionLogin: string | null;
  sessionLoading: boolean;
  openaiKey: string;
  onOpenaiKey: (v: string) => void;
  remember: boolean;
  onRemember: (v: boolean) => void;
  model: string;
  onModel: (v: string) => void;
}) {
  const signedIn = Boolean(props.sessionLogin);

  return (
    <section className="panel p-5">
      <div className="grid gap-6 sm:grid-cols-2 sm:gap-10">
        <div>
          <h2 className="label">GitHub</h2>

          <div className="mt-2.5 flex items-center gap-3">
            <button
              className={signedIn ? "btn-ghost" : "btn"}
              disabled={props.sessionLoading}
              onClick={() => void (signedIn ? signOut() : signIn("github"))}
            >
              {props.sessionLoading ? "…" : signedIn ? "Sign out" : "Sign in with GitHub"}
            </button>
            {signedIn && (
              <span className="text-sm font-medium" style={{ color: "var(--accent)" }}>
                @{props.sessionLogin}
              </span>
            )}
          </div>

          <p className="mt-2.5 text-xs muted">
            Your access token stays in an encrypted, http-only cookie and is read only by this
            app&rsquo;s server. Page scripts never see it.
          </p>
        </div>

        <div>
          <h2 className="label">OpenAI</h2>

          <div className="mt-2.5 flex gap-2">
            <input
              className="field"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="sk-…"
              value={props.openaiKey}
              onChange={(e) => props.onOpenaiKey(e.target.value)}
            />
            <select
              className="field"
              style={{ width: "auto" }}
              value={props.model}
              onChange={(e) => props.onModel(e.target.value)}
              aria-label="Model"
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <p className="mt-2.5 text-xs muted">
            Held in this tab and sent straight to OpenAI — it never reaches this app&rsquo;s
            server.
          </p>

          <label className="mt-2 flex items-start gap-2 text-xs muted">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={props.remember}
              onChange={(e) => props.onRemember(e.target.checked)}
            />
            <span>
              Keep it for this tab, so a refresh doesn&rsquo;t lose it. Cleared when the tab
              closes.
            </span>
          </label>
        </div>
      </div>
    </section>
  );
}
