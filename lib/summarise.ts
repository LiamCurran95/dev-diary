import type { Bucket } from "./types";
import { SYSTEM_PROMPT, bucketPrompt } from "./prompts";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export const MODELS = [
  { value: "gpt-4.1-mini", label: "gpt-4.1-mini — fast and cheap" },
  { value: "gpt-4.1", label: "gpt-4.1 — best quality" },
  { value: "gpt-4o-mini", label: "gpt-4o-mini" },
  { value: "gpt-4o", label: "gpt-4o" },
];

export class SummariseError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SummariseError";
    this.status = status;
  }
}

/**
 * Identifies a generated entry. Includes the PR ids so that refetching and
 * landing new work invalidates only the buckets that actually changed.
 */
export function cacheKey(bucket: Bucket, model: string): string {
  return `${model}::${bucket.key}::${bucket.prs.map((p) => p.id).sort().join(",")}`;
}

/**
 * Calls OpenAI directly from the browser with the user's own key.
 * The key is never sent anywhere else, and never leaves the tab.
 */
export async function summariseBucket(args: {
  apiKey: string;
  model: string;
  bucket: Bucket;
  signal?: AbortSignal;
}): Promise<string> {
  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiKey}`,
    },
    body: JSON.stringify({
      model: args.model,
      temperature: 0.3,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: bucketPrompt(args.bucket) },
      ],
    }),
    signal: args.signal,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? detail;
    } catch {
      /* keep statusText */
    }
    const friendly =
      res.status === 401
        ? "OpenAI rejected that API key."
        : res.status === 429
          ? "OpenAI rate limited the request (or the key has no quota)."
          : detail;
    throw new SummariseError(friendly, res.status);
  }

  const body = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = body.choices?.[0]?.message?.content;
  if (!content) throw new SummariseError("OpenAI returned an empty response.", 500);
  return content.trim();
}

/** Runs `fn` over items with a fixed concurrency ceiling, to avoid 429s. */
export async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await fn(items[index]);
    }
  });
  await Promise.all(workers);
}
