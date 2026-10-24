import type { PullRequest } from "./types";

type StreamMessage = {
  type: "progress" | "result" | "error";
  message?: string;
  prs?: PullRequest[];
};

/**
 * Fetches pull requests through the server route, which holds the OAuth token.
 * The response is newline-delimited JSON so progress arrives while the fetch
 * is still running.
 */
export async function fetchViaServer(args: {
  since: string;
  until: string;
  scope?: string;
  signal?: AbortSignal;
  onProgress?: (message: string) => void;
}): Promise<PullRequest[]> {
  const res = await fetch("/api/pull-requests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ since: args.since, until: args.until, scope: args.scope }),
    signal: args.signal,
  });

  if (!res.ok || !res.body) {
    let detail = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      detail = body.error ?? detail;
    } catch {
      /* keep statusText */
    }
    throw new Error(detail);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let result: PullRequest[] = [];

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      const message = JSON.parse(line) as StreamMessage;

      if (message.type === "progress" && message.message) {
        args.onProgress?.(message.message);
      } else if (message.type === "error") {
        throw new Error(message.message ?? "The fetch failed.");
      } else if (message.type === "result" && message.prs) {
        result = message.prs;
      }
    }
  }

  return result;
}
