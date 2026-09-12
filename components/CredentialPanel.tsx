"use client";

import { Button, Checkbox, Select, SelectItem, Tag, TextInput, Tile } from "@carbon/react";
import { signIn, signOut } from "next-auth/react";

import { PROVIDERS, type Provider, providerLabel } from "@/lib/providers";

export function CredentialPanel(props: {
  sessionLogin: string | null;
  sessionLoading: boolean;
  apiKey: string;
  onApiKey: (v: string) => void;
  provider: Provider | null;
  models: string[];
  modelsLoading: boolean;
  modelsError: string | null;
  model: string;
  onModel: (v: string) => void;
  remember: boolean;
  onRemember: (v: boolean) => void;
}) {
  const signedIn = Boolean(props.sessionLogin);
  const keyEntered = props.apiKey.trim().length > 0;

  const keyHelper = !keyEntered
    ? `Paste a key from any supported provider — ${PROVIDERS.map((p) => p.label).join(" or ")}. The provider is detected from the key itself.`
    : props.provider
      ? "Held in this tab and sent straight to the provider — it never reaches this app's server."
      : "That doesn't look like a key from a supported provider. Expected one starting sk- or sk-ant-.";

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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "0.5rem",
            }}
          >
            <p className="section-label" style={{ margin: 0 }}>
              AI provider
            </p>
            {props.provider && <Tag type="blue">{providerLabel(props.provider)}</Tag>}
          </div>

          <TextInput
            id="api-key"
            type="password"
            labelText="API key"
            placeholder="sk-… or sk-ant-…"
            autoComplete="off"
            spellCheck={false}
            invalid={keyEntered && !props.provider}
            invalidText={keyHelper}
            helperText={keyEntered && !props.provider ? undefined : keyHelper}
            value={props.apiKey}
            onChange={(e) => props.onApiKey(e.target.value)}
          />

          <div style={{ marginTop: "1rem" }}>
            <Select
              id="model"
              labelText="Model"
              disabled={props.models.length === 0}
              value={props.model}
              onChange={(e) => props.onModel(e.target.value)}
              helperText={
                props.modelsLoading
                  ? "Loading the models this key can use…"
                  : props.modelsError
                    ? props.modelsError
                    : props.models.length > 0
                      ? `${props.models.length} models available to this key`
                      : "Enter a key to load the models it can use"
              }
              invalid={Boolean(props.modelsError)}
              invalidText={props.modelsError ?? ""}
            >
              {props.models.length === 0 ? (
                <SelectItem value="" text="—" />
              ) : (
                props.models.map((id) => <SelectItem key={id} value={id} text={id} />)
              )}
            </Select>
          </div>

          <p className="muted" style={{ marginTop: "1rem", fontSize: "0.75rem", lineHeight: 1.5 }}>
            Pull request titles and descriptions are sent to the provider so it can write the
            entries. For private or work repositories, check that is acceptable before generating.
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
