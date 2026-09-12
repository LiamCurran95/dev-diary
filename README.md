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
cp .env.example .env.local   # fill in the values below
npm run dev
```

Then open http://localhost:3000.

### Connecting to GitHub

Sign-in is OAuth only. Your access token is stored in an encrypted, http-only
cookie and read only by this app's server when it fetches on your behalf. Page
JavaScript never sees it, and it is deliberately kept off the session object so
it does not appear in `/api/auth/session` either.

To enable sign-in, register an OAuth App at
https://github.com/settings/developers with:

```
Homepage URL:               http://localhost:3000
Authorization callback URL: http://localhost:3000/api/auth/callback/github
```

then set three values in `.env.local`:

```
AUTH_SECRET=          # generate with: npx auth secret
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
```

In production, swap `localhost:3000` for your deployed origin in both the GitHub
app settings and your environment.

If your repositories live in an organisation with SAML SSO, the OAuth app must be
authorised for that organisation. Without it the API behaves as though those
repositories do not exist and the search simply returns nothing, which is a
confusing failure to debug from the outside.

A note on scope: OAuth Apps have no read-only equivalent of GitHub's `repo`
scope, so signing in grants broader access than this app needs — it only ever
reads. If that breadth is unacceptable for your organisation, a GitHub App with
read-only repository permissions is the narrower instrument, and the server route
would need only a different token source.

### Choosing an AI provider

There is one API key field, and the provider is worked out from the key itself:
a key beginning `sk-ant-` is Anthropic, anything else beginning `sk-` is OpenAI.
The key is only ever sent to the provider it belongs to.

Once a key is entered, the model dropdown is populated by asking that provider
which models the key can actually use, rather than offering a fixed list. Both
vendors can restrict a key or project to a subset of models, and a fixed list
turns that into a confusing failure at generate time — "project does not have
access to model X" — long after the point where it could have been avoided.

Note that a Claude.ai subscription is not API access. Pro and Max cover
claude.ai and Claude Code; using Claude here needs an API key from
console.anthropic.com, billed separately.

### What gets sent to the provider

Generating an entry sends the titles and descriptions of the pull requests in
that period to whichever provider the key belongs to. Nothing else leaves — not
diffs, not file contents, not commit messages — but for private or
employer-owned repositories, pull request descriptions can still carry
architecture decisions, incident detail or customer names. Check that is
acceptable under your organisation's policy before pointing this at work
repositories. Fetching and bucketing involve no model calls at all, so browsing
which pull requests fall in which period is always safe.

### Where the API key lives

The key is held in a React state variable for the life of the tab. It is never
written to `localStorage`, never placed in a cookie, and never sent to this
application's server — the browser calls the provider directly, so whoever hosts
this is structurally incapable of seeing it.

There is an opt-in checkbox to hold it in `sessionStorage` so a refresh doesn't
lose it. That storage is cleared when the tab closes, and it is off by default.

### Getting a GitHub token (for the CLI)

The web app uses OAuth and needs no token. The CLI does — create one at
https://github.com/settings/tokens (Tokens classic) with the `repo` scope, or a
fine-grained token at https://github.com/settings/personal-access-tokens with
read-only access to the repositories you care about. Fine-grained is the better
choice: read-only, scoped to named repositories, and it expires on its own.

For SAML SSO organisations, authorise the token for the organisation as well.

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

## Known limitations

Recorded here rather than discovered later.

**Long fetches will time out when deployed.** Requests to GitHub's search API are
paced roughly two seconds apart to stay inside its 30-per-minute limit, so a
twelve-month range across several repositories takes minutes of wall clock.
Vercel's Hobby tier kills a function at 60 seconds. Streaming keeps bytes moving
but does not extend that limit. The fix is to have the client request one date
window per call rather than the whole range in one; it runs fine locally in the
meantime.

**Entries can be silently truncated.** Anthropic responses are capped at 2048
tokens and the cap is not currently checked against `stop_reason`, so a dense
period can produce an entry that stops mid-sentence with no warning. The OpenAI
path sets no cap and behaves differently for the same input.

**Periods with more than 60 pull requests are summarised from a subset.** The
prompt includes the 60 most recent and pull request descriptions are truncated at
1200 characters, while the heading still reports the full count.

**Request pacing state is per-process, not per-user.** `lastSearchAt` in
`lib/github.ts` is module scope. That was correct when the fetcher only ran in a
browser; now that it also runs in the API route, concurrent users of one
deployment throttle each other.

**The fetcher is untested.** Unit tests cover the date bucketing and the provider
helpers. Pagination, the recursive window-splitting around the 1000-result search
cap, and the rate-limit backoff have no coverage, which is where bugs are most
likely to be.

## Project layout

```
app/
  api/auth/[...nextauth]/  Auth.js route handlers
  api/pull-requests/       Server-side fetch; holds the OAuth token, streams NDJSON progress
  globals.scss             Carbon theme, bound to the system colour scheme
  layout.tsx, page.tsx     Shell and the single page
  providers.tsx            Session provider
auth.ts                    Auth.js config; the access token is kept off the session object
components/                UI, built on @carbon/react
lib/
  github.ts                Paginated, throttled pull request search
  buckets.ts               Timeframe grouping (pure, synchronous)
  providers.ts             OpenAI and Anthropic behind one interface; key-prefix detection
  summarise.ts             One diary entry per period
  prompts.ts               System prompt and the per-period prompt
  fetch-client.ts          Reads the server route's streamed response
  types.ts                 Shared types
  __tests__/               Unit tests for bucketing and provider selection
scripts/dev-diary.ts       CLI entry point, sharing lib/ with the web app
types/next-auth.d.ts       Session and JWT type augmentation
```

## Checks

```bash
npm run typecheck
npm test
npm run build
```
