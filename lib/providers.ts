export type Provider = "openai" | "anthropic";

export type ProviderInfo = {
  value: Provider;
  label: string;
  keyPlaceholder: string;
  consoleUrl: string;
  consoleLabel: string;
};

export const PROVIDERS: ProviderInfo[] = [
  {
    value: "openai",
    label: "OpenAI",
    keyPlaceholder: "sk-…",
    consoleUrl: "https://platform.openai.com/api-keys",
    consoleLabel: "platform.openai.com",
  },
  {
    value: "anthropic",
    label: "Anthropic (Claude)",
    keyPlaceholder: "sk-ant-…",
    consoleUrl: "https://console.anthropic.com/settings/keys",
    consoleLabel: "console.anthropic.com",
  },
];

/**
 * Which provider a key belongs to, from its prefix alone. Anthropic keys are
 * "sk-ant-…"; OpenAI's user, project and service-account keys are all "sk-…".
 * Deliberately prefix-based rather than probing both providers, so a key is
 * never sent to the vendor it does not belong to.
 */
export function detectProvider(apiKey: string): Provider | null {
  const key = apiKey.trim();
  if (/^sk-ant-/i.test(key)) return "anthropic";
  if (/^sk-/i.test(key)) return "openai";
  return null;
}

export function providerLabel(provider: Provider): string {
  return PROVIDERS.find((p) => p.value === provider)?.label ?? provider;
}

export class ProviderError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ProviderError";
    this.status = status;
  }
}

const ENDPOINTS: Record<Provider, { models: string; completion: string }> = {
  openai: {
    models: "https://api.openai.com/v1/models",
    completion: "https://api.openai.com/v1/chat/completions",
  },
  anthropic: {
    models: "https://api.anthropic.com/v1/models",
    completion: "https://api.anthropic.com/v1/messages",
  },
};

/**
 * Anthropic requires an explicit opt-in header before it will serve CORS to a
 * browser. Both providers are called straight from the tab so the key never
 * reaches this app's server.
 */
function headers(provider: Provider, apiKey: string): Record<string, string> {
  if (provider === "anthropic") {
    return {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    };
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    return body.error?.message ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

function friendly(status: number, detail: string): string {
  if (status === 401 || status === 403) return `The API key was rejected: ${detail}`;
  if (status === 429) return "Rate limited, or the key has no remaining quota.";
  return detail;
}

const CHAT_LIKE = /^(gpt-|o[1-9]|claude)/;
// Codex models are served only by the Responses API, not Chat Completions.
const NOT_CHAT =
  /(embedding|tts|whisper|dall-e|moderation|audio|transcribe|realtime|image|search|instruct|codex)/;

// Neither models endpoint reports deprecation, so generations the vendors have
// already deprecated or retired are named here. Extend it as they announce more.
const LEGACY = /^(gpt-3\.5|gpt-4(-\d|-turbo|-vision|$)|o1-(preview|mini)|claude-(2|instant|3-))/;

// Dated pins such as gpt-4o-2024-08-06, gpt-4-0613 or claude-…-20250929.
const SNAPSHOT_SUFFIX = /-(\d{4}-\d{2}-\d{2}|\d{8}|\d{4})$/;

// Still served, but with an announced shutdown (GPT-4o and GPT-4.1 families:
// January 2027). Offered with a label rather than hidden, since a key's project
// may allow nothing newer.
const DEPRECATED = /^(gpt-4o|gpt-4\.1)/;

export function isDeprecated(id: string): boolean {
  return DEPRECATED.test(id);
}

export type ModelInfo = { id: string; created: number };

/**
 * Narrows a raw model list to current text models this app can use: drops
 * non-chat and legacy models, and dated snapshots whose undated alias is also
 * listed. Newest first, so current models lead the dropdown.
 */
export function chatModels(models: (string | ModelInfo)[]): string[] {
  const all = models.map((m) => (typeof m === "string" ? { id: m, created: 0 } : m));
  const ids = new Set(all.map((m) => m.id));

  return all
    .filter(({ id }) => CHAT_LIKE.test(id) && !NOT_CHAT.test(id) && !LEGACY.test(id))
    .filter(({ id }) => {
      const alias = id.replace(SNAPSHOT_SUFFIX, "");
      return alias === id || !ids.has(alias);
    })
    .sort((a, b) => b.created - a.created || a.id.localeCompare(b.id))
    .map((m) => m.id);
}

/** Cheap-and-capable first, so a long back catalogue doesn't cost a fortune by default. */
const PREFERENCE: Record<Provider, RegExp[]> = {
  openai: [
    /^gpt-5(\.\d+)*-mini$/,
    /^gpt-5(\.\d+)*$/,
    /^gpt-4\.1-mini$/,
    /^gpt-4o-mini$/,
    /^gpt-4\.1$/,
    /mini/,
  ],
  anthropic: [/haiku/, /sonnet/],
};

export function pickDefaultModel(
  provider: Provider,
  available: string[],
  current: string,
): string {
  if (available.includes(current)) return current;
  // A current model is preferred over a deprecated one, whatever the pattern order.
  const supported = available.filter((id) => !isDeprecated(id));
  for (const pool of [supported, available]) {
    for (const pattern of PREFERENCE[provider]) {
      const match = pool.find((id) => pattern.test(id));
      if (match) return match;
    }
  }
  return supported[0] ?? available[0] ?? "";
}

/**
 * The models this key is actually entitled to. Both providers can restrict a
 * key or project to a subset, so offering a fixed list surfaces "does not have
 * access to model X" at generate time rather than at key-entry time.
 */
export async function listModels(
  provider: Provider,
  apiKey: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const res = await fetch(ENDPOINTS[provider].models, {
    headers: headers(provider, apiKey),
    signal,
  });

  if (!res.ok) throw new ProviderError(friendly(res.status, await readError(res)), res.status);

  // OpenAI reports `created` in Unix seconds, Anthropic `created_at` as ISO 8601.
  const body = (await res.json()) as {
    data?: { id: string; created?: number; created_at?: string }[];
  };
  return chatModels(
    (body.data ?? []).map((m) => ({
      id: m.id,
      created: m.created ? m.created * 1000 : m.created_at ? Date.parse(m.created_at) || 0 : 0,
    })),
  );
}

export const TRUNCATION_NOTE =
  "_This entry was cut off at the model's length limit. Regenerate it, or use a shorter timeframe._";

/** One completion, normalised across the two providers' request and response shapes. */
export async function complete(args: {
  provider: Provider;
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  signal?: AbortSignal;
}): Promise<string> {
  const body =
    args.provider === "anthropic"
      ? {
          model: args.model,
          max_tokens: 4096,
          system: args.system,
          messages: [{ role: "user", content: args.prompt }],
        }
      : {
          model: args.model,
          temperature: 0.3,
          messages: [
            { role: "system", content: args.system },
            { role: "user", content: args.prompt },
          ],
        };

  const send = (payload: object) =>
    fetch(ENDPOINTS[args.provider].completion, {
      method: "POST",
      headers: headers(args.provider, args.apiKey),
      body: JSON.stringify(payload),
      signal: args.signal,
    });

  let res = await send(body);

  // Reasoning models only accept the default temperature. Rather than keep a
  // list of which models those are, retry once without it when it's rejected.
  if (res.status === 400 && "temperature" in body) {
    const detail = await readError(res);
    if (!/temperature/i.test(detail)) throw new ProviderError(detail, res.status);
    const { temperature: _temperature, ...rest } = body;
    res = await send(rest);
  }

  if (!res.ok) throw new ProviderError(friendly(res.status, await readError(res)), res.status);

  const json = (await res.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
    content?: { type: string; text?: string }[];
    stop_reason?: string;
  };

  const text =
    args.provider === "anthropic"
      ? json.content?.find((part) => part.type === "text")?.text
      : json.choices?.[0]?.message?.content;

  if (!text) throw new ProviderError("The model returned an empty response.", 500);

  // A dense period can hit the length cap; say so rather than end mid-sentence.
  const truncated =
    args.provider === "anthropic"
      ? json.stop_reason === "max_tokens"
      : json.choices?.[0]?.finish_reason === "length";

  return truncated ? `${text.trim()}\n\n${TRUNCATION_NOTE}` : text.trim();
}
