# Dev Diary

Turn your merged GitHub pull requests into a written developer diary, chunked by
whatever timeframe you like.

Fetch your pull requests once, then regroup them daily, weekly, fortnightly,
monthly or quarterly without touching the network again. Each period gets a
single entry that finds the through-line across its pull requests, rather than a
mechanical summary of each one.

There are two ways to run it: a web app, and the original CLI script.

## Web app

```bash
npm install
npm run dev
```

Then open http://localhost:3000, paste a GitHub token and an OpenAI key, pick a
date range, and fetch.

### Where the keys live

Both keys are held in a React state variable for the life of the tab. They are
never written to `localStorage`, never placed in a cookie, and never sent to this
application's server — the browser calls `api.github.com` and `api.openai.com`
directly, so whoever hosts this is structurally incapable of seeing them.

There is an opt-in checkbox to hold them in `sessionStorage` instead, so a page
refresh doesn't lose them. That storage is cleared when the tab closes. It is off
by default.

Because nothing secret lives on the server, the app deploys as a fully static
site — Vercel, Netlify, Cloudflare Pages or GitHub Pages all work, with no
environment variables to configure.

### Getting a GitHub token

Create one at https://github.com/settings/tokens (Tokens classic) with the
`repo` scope. If the work you want to summarise lives in an organisation with
SAML SSO, use the "Configure SSO" dropdown next to the token to authorise it for
that organisation, otherwise those repositories are invisible to the API and the
search simply returns nothing.

## CLI

The original script still works and now shares its fetching, bucketing and
prompting logic with the web app.

Create a `.env`:

```
GITHUB_TOKEN=ghp_your_personal_access_token
OPENAI_API_KEY=your-openai-key
SINCE_DATE=2025-09-01
UNTIL_DATE=2026-09-12       # optional, defaults to today
SCOPE=org:your-org          # optional, e.g. org:foo or repo:owner/name
GRANULARITY=month           # day | week | fortnight | month | quarter
MODEL=gpt-4.1-mini          # optional
OUTPUT=developer-diary.md   # optional
```

Then:

```bash
npm run dev-diary
```

## How it works

The pipeline is deliberately split into four independent stages, because the
expensive stages should not rerun when only a cheap one changes.

Fetching queries GitHub's search API for merged pull requests you authored,
paginated at 100 per page and paced roughly two seconds apart to stay inside the
30-requests-per-minute search limit. A single search can never page past 1000
results, so when a date window exceeds that the window is halved and searched
recursively until each piece fits.

Bucketing is a pure synchronous function over the fetched pull requests, which is
why switching granularity is instant and costs nothing.

Summarising makes one model call per period rather than one per pull request —
cheaper, and the output is more useful, because a month's entry can describe
themes that no single pull request shows. Results are cached against a key that
includes the period and the ids of the pull requests in it, so changing
granularity only generates the periods you haven't seen, and refetching
invalidates only the periods that actually changed. Calls run three at a time to
stay clear of rate limits.

Rendering and export are plain markdown, so the output drops straight into a
document, a performance review, or a CV.

## Project layout

```
app/          Next.js App Router pages
components/   UI
lib/          Shared logic — github.ts, buckets.ts, prompts.ts, summarise.ts
lib/__tests__ Unit tests for the bucketing maths
scripts/      The CLI entry point
```

## Checks

```bash
npm run typecheck
npm test
npm run build
```
