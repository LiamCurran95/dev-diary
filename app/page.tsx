"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InlineNotification } from "@carbon/react";
import { useSession } from "next-auth/react";

import { CredentialPanel } from "@/components/CredentialPanel";
import { DiaryView } from "@/components/DiaryView";
import { FetchConfig } from "@/components/FetchConfig";
import { groupIntoBuckets } from "@/lib/buckets";
import { fetchViaServer } from "@/lib/fetch-client";
import { cacheKey, mapWithConcurrency, summariseBucket } from "@/lib/summarise";
import type { Bucket, Granularity, PullRequest } from "@/lib/types";

const SESSION_OAI = "dev-diary.openai-key";
const CONCURRENCY = 3;

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export default function Page() {
  const { data: session, status } = useSession();
  const sessionLogin = session?.login ?? null;

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
      const stored = sessionStorage.getItem(SESSION_OAI);
      if (stored) {
        setOpenaiKey(stored);
        setRemember(true);
      }
    } catch {
      /* sessionStorage can throw in private modes; memory-only is a fine fallback. */
    }
  }, []);

  useEffect(() => {
    try {
      if (remember) sessionStorage.setItem(SESSION_OAI, openaiKey);
      else sessionStorage.removeItem(SESSION_OAI);
    } catch {
      /* ignore */
    }
  }, [remember, openaiKey]);

  const buckets = useMemo(
    () => (prs ? groupIntoBuckets(prs, granularity) : []),
    [prs, granularity],
  );

  const runFetch = useCallback(async () => {
    const controller = new AbortController();
    fetchAbort.current = controller;

    setFetching(true);
    setError(null);
    setProgress("Starting…");

    try {
      const list = await fetchViaServer({
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
  }, [since, until, scope]);

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

      // Collected rather than set per failure, so concurrent errors don't
      // overwrite one another and leave only the last visible.
      const failures: string[] = [];

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
          if (!controller.signal.aborted) failures.push(`${bucket.label}: ${message(e)}`);
        } finally {
          setBusyKeys((prev) => {
            const next = new Set(prev);
            next.delete(bucket.key);
            return next;
          });
        }
      });

      if (failures.length === 1) setError(failures[0]);
      else if (failures.length > 1) {
        setError(`${failures.length} periods failed. First: ${failures[0]}`);
      }

      setGenerating(false);
      setBusyKeys(new Set());
    },
    [openaiKey, model],
  );

  const generateAll = useCallback(() => {
    void generate(buckets.filter((b) => !entries[cacheKey(b, model)]));
  }, [generate, buckets, entries, model]);

  const fullMarkdown = useCallback(() => {
    const header = [
      "# Developer diary",
      `_${sessionLogin ?? "unknown"} · ${since} to ${until} · grouped ${granularity}_`,
    ].join("\n\n");

    const body = buckets
      .map((b) => entries[cacheKey(b, model)])
      .filter(Boolean)
      .join("\n\n---\n\n");

    return `${header}\n\n---\n\n${body}\n`;
  }, [buckets, entries, model, sessionLogin, since, until, granularity]);

  const onExport = useCallback(() => {
    const blob = new Blob([fullMarkdown()], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `developer-diary-${since}-to-${until}.md`;
    anchor.click();
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
    <div className="stack">
      <div>
        <h1 style={{ fontSize: "1.75rem", fontWeight: 400, margin: 0 }}>Developer diary</h1>
        <p className="muted" style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
          Turn your merged pull requests into a written diary. Fetch once, then re-chunk by any
          timeframe without touching the network again.
        </p>
      </div>

      <CredentialPanel
        sessionLogin={sessionLogin}
        sessionLoading={status === "loading"}
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
        canFetch={Boolean(since && until && sessionLogin)}
        signedIn={Boolean(sessionLogin)}
        onFetch={() => void runFetch()}
        onCancel={() => fetchAbort.current?.abort()}
        prCount={prs?.length ?? null}
      />

      {error && (
        <InlineNotification
          kind="error"
          lowContrast
          title="Something went wrong"
          subtitle={error}
          onCloseButtonClick={() => setError(null)}
        />
      )}

      {prs && prs.length > 0 && (
        <DiaryView
          buckets={buckets}
          prCount={prs.length}
          entries={entries}
          model={model}
          granularity={granularity}
          onGranularity={setGranularity}
          busyKeys={busyKeys}
          generating={generating}
          hasOpenAiKey={Boolean(openaiKey)}
          onGenerateAll={generateAll}
          onGenerateOne={(b) => void generate([b])}
          onCancelGenerate={() => genAbort.current?.abort()}
          onExport={onExport}
          onCopy={() => void onCopy()}
          copied={copied}
        />
      )}

      {prs && prs.length === 0 && (
        <InlineNotification
          kind="info"
          lowContrast
          title="No merged pull requests in that range"
          subtitle="If the work lives in a private organisation, check this app has been granted access to it — for SAML SSO organisations that means authorising it for the organisation explicitly."
          hideCloseButton
        />
      )}
    </div>
  );
}
