"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "next-auth/react";

import { CredentialPanel, type AuthMode } from "@/components/CredentialPanel";
import { DiaryView } from "@/components/DiaryView";
import { FetchConfig } from "@/components/FetchConfig";
import { TimeframeSelector } from "@/components/TimeframeSelector";
import { groupIntoBuckets } from "@/lib/buckets";
import { fetchViaServer } from "@/lib/fetch-client";
import { fetchMergedPullRequests, getViewer } from "@/lib/github";
import { cacheKey, mapWithConcurrency, summariseBucket } from "@/lib/summarise";
import type { Bucket, Granularity, PullRequest } from "@/lib/types";

const SESSION_GH = "dev-diary.github-token";
const SESSION_OAI = "dev-diary.openai-key";
const CONCURRENCY = 3;

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function Page() {
  const { data: session, status } = useSession();

  const [authMode, setAuthMode] = useState<AuthMode>("oauth");
  const [githubToken, setGithubToken] = useState("");
  const [tokenViewer, setTokenViewer] = useState<{ login: string; name: string | null } | null>(null);
  const [connecting, setConnecting] = useState(false);

  const [openaiKey, setOpenaiKey] = useState("");
  const [remember, setRemember] = useState(false);
  const [model, setModel] = useState("gpt-4.1-mini");

  const [since, setSince] = useState("");
  const [until, setUntil] = useState("");
  const [scope, setScope] = useState("");

  const [prs, setPrs] = useState<PullRequest[] | null>(null);
  const [fetching, setFetching] = useState(false);
  const [progress, setProgress] = useState("");

  const [granularity, setGranularity] = useState<Granularity>("month");
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [busyKeys, setBusyKeys] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchAbort = useRef<AbortController | null>(null);
  const genAbort = useRef<AbortController | null>(null);

  const sessionLogin = session?.login ?? null;

  // Defaults are set after mount so server and client markup agree.
  useEffect(() => {
    const now = new Date();
    setUntil(now.toISOString().slice(0, 10));
    setSince(
      new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate()))
        .toISOString()
        .slice(0, 10),
    );

    try {
      const gh = sessionStorage.getItem(SESSION_GH);
      const oai = sessionStorage.getItem(SESSION_OAI);
      if (gh || oai) {
        setGithubToken(gh ?? "");
        setOpenaiKey(oai ?? "");
        setRemember(true);
        if (gh) setAuthMode("token");
      }
    } catch {
      /* sessionStorage can throw in private modes; memory-only is a fine fallback. */
    }
  }, []);

  useEffect(() => {
    try {
      if (remember) {
        sessionStorage.setItem(SESSION_GH, githubToken);
        sessionStorage.setItem(SESSION_OAI, openaiKey);
      } else {
        sessionStorage.removeItem(SESSION_GH);
        sessionStorage.removeItem(SESSION_OAI);
      }
    } catch {
      /* ignore */
    }
  }, [remember, githubToken, openaiKey]);

  const buckets = useMemo(
    () => (prs ? groupIntoBuckets(prs, granularity) : []),
    [prs, granularity],
  );

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      setTokenViewer(await getViewer(githubToken));
    } catch (e) {
      setTokenViewer(null);
      setError(message(e));
    } finally {
      setConnecting(false);
    }
  }, [githubToken]);

  const canFetch = Boolean(
    since && until && (authMode === "oauth" ? sessionLogin : tokenViewer),
  );

  const runFetch = useCallback(async () => {
    const controller = new AbortController();
    fetchAbort.current = controller;

    setFetching(true);
    setError(null);
    setProgress("Starting…");

    try {
      const list =
        authMode === "oauth"
          ? await fetchViaServer({
              since,
              until,
              scope,
              signal: controller.signal,
              onProgress: setProgress,
            })
          : await fetchMergedPullRequests({
              token: githubToken,
              login: tokenViewer!.login,
              since,
              until,
              scope,
              signal: controller.signal,
              onProgress: setProgress,
            });

      setPrs(list);
      setEntries({});
    } catch (e) {
      if (!controller.signal.aborted) setError(message(e));
    } finally {
      setFetching(false);
    }
  }, [authMode, githubToken, tokenViewer, since, until, scope]);

  const generate = useCallback(
    async (targets: Bucket[]) => {
      if (!openaiKey) {
        setError("Add your OpenAI API key to generate entries.");
        return;
      }
      const controller = new AbortController();
      genAbort.current = controller;

      setGenerating(true);
      setError(null);
      setBusyKeys(new Set(targets.map((b) => b.key)));

      await mapWithConcurrency(targets, CONCURRENCY, async (bucket) => {
        try {
          const markdown = await summariseBucket({
            apiKey: openaiKey,
            model,
            bucket,
            signal: controller.signal,
          });
          setEntries((prev) => ({ ...prev, [cacheKey(bucket, model)]: markdown }));
        } catch (e) {
          if (!controller.signal.aborted) setError(message(e));
        } finally {
          setBusyKeys((prev) => {
            const next = new Set(prev);
            next.delete(bucket.key);
            return next;
          });
        }
      });

      setGenerating(false);
      setBusyKeys(new Set());
    },
    [openaiKey, model],
  );

  const generateAll = useCallback(() => {
    void generate(buckets.filter((b) => !entries[cacheKey(b, model)]));
  }, [generate, buckets, entries, model]);

  const fullMarkdown = useCallback(() => {
    const who = authMode === "oauth" ? sessionLogin : tokenViewer?.login;
    const header = [
      "# Developer diary",
      `_${who ?? "unknown"} · ${since} to ${until} · grouped ${granularity}_`,
    ].join("\n\n");

    const body = buckets
      .map((b) => entries[cacheKey(b, model)])
      .filter(Boolean)
      .join("\n\n---\n\n");

    return `${header}\n\n---\n\n${body}\n`;
  }, [buckets, entries, model, authMode, sessionLogin, tokenViewer, since, until, granularity]);

  const onExport = useCallback(() => {
    const blob = new Blob([fullMarkdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `developer-diary-${since}-to-${until}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [fullMarkdown, since, until]);

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fullMarkdown());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("Could not write to the clipboard. Use Export instead.");
    }
  }, [fullMarkdown]);

  return (
    <main className="mx-auto max-w-4xl px-4" style={{ paddingBlock: "2.5rem" }}>
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Dev Diary</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Turn your merged pull requests into a written diary. Fetch once, then re-chunk by any
          timeframe without touching the network again.
        </p>
      </header>

      <div className="space-y-4">
        <CredentialPanel
          authMode={authMode}
          onAuthMode={setAuthMode}
          sessionLogin={sessionLogin}
          sessionLoading={status === "loading"}
          githubToken={githubToken}
          onGithubToken={setGithubToken}
          tokenViewer={tokenViewer}
          connecting={connecting}
          onConnect={() => void connect()}
          openaiKey={openaiKey}
          onOpenaiKey={setOpenaiKey}
          remember={remember}
          onRemember={setRemember}
          model={model}
          onModel={setModel}
        />

        <FetchConfig
          since={since}
          onSince={setSince}
          until={until}
          onUntil={setUntil}
          scope={scope}
          onScope={setScope}
          fetching={fetching}
          progress={progress}
          canFetch={canFetch}
          onFetch={() => void runFetch()}
          onCancel={() => fetchAbort.current?.abort()}
          prCount={prs?.length ?? null}
        />

        {error && (
          <div
            className="panel p-4 text-sm"
            style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
          >
            {error}
          </div>
        )}

        {prs && prs.length > 0 && (
          <>
            <section className="panel p-5">
              <h2
                className="text-sm font-semibold tracking-wide uppercase mb-3"
                style={{ color: "var(--muted)" }}
              >
                Chunk by
              </h2>
              <TimeframeSelector value={granularity} onChange={setGranularity} disabled={generating} />
            </section>

            <DiaryView
              buckets={buckets}
              entries={entries}
              model={model}
              busyKeys={busyKeys}
              generating={generating}
              hasOpenAiKey={Boolean(openaiKey)}
              onGenerateAll={generateAll}
              onGenerateOne={(b) => void generate([b])}
              onExport={onExport}
              onCopy={() => void onCopy()}
              copied={copied}
            />
          </>
        )}

        {prs && prs.length === 0 && (
          <div className="panel p-5 text-sm" style={{ color: "var(--muted)" }}>
            No merged pull requests found in that range. If the work lives in a private
            organisation, check that access has been granted for it — for SAML SSO organisations
            that means authorising this app, or the token, for the organisation explicitly.
          </div>
        )}
      </div>
    </main>
  );
}
