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
const NOT_CHAT =
  /(embedding|tts|whisper|dall-e|moderation|audio|transcribe|realtime|image|search|instruct)/;

/** Narrows a raw model list to the text models this app can actually use. */
export function chatModels(ids: string[]): string[] {
  return ids.filter((id) => CHAT_LIKE.test(id) && !NOT_CHAT.test(id)).sort();
}

/** Cheap-and-capable first, so a long back catalogue doesn't cost a fortune by default. */
const PREFERENCE: Record<Provider, RegExp[]> = {
  openai: [/^gpt-4\.1-mini$/, /^gpt-4o-mini$/, /^gpt-4\.1$/, /mini/],
  anthropic: [/haiku/, /sonnet/],
};

export function pickDefaultModel(
  provider: Provider,
  available: string[],
  current: string,
): string {
  if (available.includes(current)) return current;
  for (const pattern of PREFERENCE[provider]) {
    const match = available.find((id) => pattern.test(id));
    if (match) return match;
  }
  return available[0] ?? "";
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

  const body = (await res.json()) as { data?: { id: string }[] };
  return chatModels((body.data ?? []).map((m) => m.id));
}

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
          max_tokens: 2048,
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

  const res = await fetch(ENDPOINTS[args.provider].completion, {
    method: "POST",
    headers: headers(args.provider, args.apiKey),
    body: JSON.stringify(body),
    signal: args.signal,
  });

  if (!res.ok) throw new ProviderError(friendly(res.status, await readError(res)), res.status);

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    content?: { type: string; text?: string }[];
  };

  const text =
    args.provider === "anthropic"
      ? json.content?.find((part) => part.type === "text")?.text
      : json.choices?.[0]?.message?.content;

  if (!text) throw new ProviderError("The model returned an empty response.", 500);
  return text.trim();
}
