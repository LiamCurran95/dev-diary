import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

import { fetchMergedPullRequests } from "@/lib/github";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Fetching a wide date range takes minutes, because GitHub's search API is
// paced to stay inside its 30-requests-per-minute limit. 60s is the Vercel
// Hobby ceiling; Pro allows up to 300. Beyond that the client must drive one
// date window per request rather than the whole range in one.
export const maxDuration = 60;

type Body = { since?: string; until?: string; scope?: string };

/**
 * Fetches pull requests on the user's behalf using the OAuth token held in the
 * encrypted session cookie. The token is read here and never sent to the
 * browser. Progress is streamed back as newline-delimited JSON so the UI can
 * report what it is doing during a long fetch.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const jwt = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    secureCookie: process.env.NODE_ENV === "production",
  });

  const accessToken = jwt?.accessToken;
  const login = jwt?.login;

  if (!accessToken || !login) {
    return Response.json({ error: "Not signed in with GitHub." }, { status: 401 });
  }

  const { since, until, scope } = (await req.json()) as Body;
  if (!since || !until) {
    return Response.json({ error: "A start and end date are required." }, { status: 400 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (payload: unknown) =>
        controller.enqueue(encoder.encode(`${JSON.stringify(payload)}\n`));

      try {
        const prs = await fetchMergedPullRequests({
          token: accessToken,
          login,
          since,
          until,
          scope,
          onProgress: (message) => send({ type: "progress", message }),
        });
        send({ type: "result", prs });
      } catch (error) {
        send({
          type: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
