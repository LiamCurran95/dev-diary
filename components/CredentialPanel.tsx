"use client";

import { Button, Checkbox, Select, SelectItem, Tag, TextInput, Tile } from "@carbon/react";
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
    <Tile className="panel">
      <div className="row" style={{ alignItems: "flex-start", gap: "2.5rem" }}>
        <div className="grow">
          <p className="section-label">GitHub</p>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
            <Button
              kind={signedIn ? "tertiary" : "primary"}
              disabled={props.sessionLoading}
              onClick={() => void (signedIn ? signOut() : signIn("github"))}
            >
              {props.sessionLoading ? "Checking…" : signedIn ? "Sign out" : "Sign in with GitHub"}
            </Button>
            {signedIn && <Tag type="green">@{props.sessionLogin}</Tag>}
          </div>

          <p className="muted" style={{ marginTop: "1rem", fontSize: "0.75rem", lineHeight: 1.5 }}>
            Your access token stays in an encrypted, http-only cookie and is read only by this
            app&rsquo;s server. Page scripts never see it.
          </p>
        </div>

        <div className="grow">
          <p className="section-label">OpenAI</p>

          <TextInput
            id="openai-key"
            type="password"
            labelText="API key"
            placeholder="sk-…"
            autoComplete="off"
            spellCheck={false}
            helperText="Held in this tab and sent straight to OpenAI — it never reaches this app's server."
            value={props.openaiKey}
            onChange={(e) => props.onOpenaiKey(e.target.value)}
          />

          <div style={{ marginTop: "1rem" }}>
            <Select
              id="model"
              labelText="Model"
              value={props.model}
              onChange={(e) => props.onModel(e.target.value)}
            >
              {MODELS.map((m) => (
                <SelectItem key={m.value} value={m.value} text={m.label} />
              ))}
            </Select>
          </div>

          <p
            className="muted"
            style={{ marginTop: "1rem", fontSize: "0.75rem", lineHeight: 1.5 }}
          >
            Pull request titles and descriptions are sent to OpenAI so it can write the entries.
            For private or work repositories, check that is acceptable before generating.
          </p>

          <div style={{ marginTop: "1rem" }}>
            <Checkbox
              id="remember-key"
              labelText="Keep the key for this tab, so a refresh doesn't lose it"
              checked={props.remember}
              onChange={(_event, data: { checked: boolean }) => props.onRemember(data.checked)}
            />
          </div>
        </div>
      </div>
    </Tile>
  );
}
