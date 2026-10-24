import { type Provider, complete } from "./providers";
import { SYSTEM_PROMPT, bucketPrompt, entryHeader, entryPullRequests } from "./prompts";
import type { Bucket } from "./types";

/**
 * Identifies a generated entry. Includes the PR ids so that refetching and
 * landing new work invalidates only the buckets that actually changed.
 */
export function cacheKey(bucket: Bucket, model: string): string {
  return `${model}::${bucket.key}::${bucket.prs.map((p) => p.id).sort().join(",")}`;
}

/**
 * Writes one diary entry for one period. Called straight from the browser with
 * the user's own key, so the key never reaches this app's server.
 */
export async function summariseBucket(args: {
  provider: Provider;
  apiKey: string;
  model: string;
  bucket: Bucket;
  signal?: AbortSignal;
}): Promise<string> {
  const body = await complete({
    provider: args.provider,
    apiKey: args.apiKey,
    model: args.model,
    system: SYSTEM_PROMPT,
    prompt: bucketPrompt(args.bucket),
    signal: args.signal,
  });
  return [entryHeader(args.bucket), body, entryPullRequests(args.bucket)].join("\n\n");
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
