## Dev Diary Script Usage

Fetch your merged GitHub pull requests, summarise them with the OpenAI SDK, and write a structured daily entry to `developer-diary.md`. Follow the steps below to configure and run.

### 1. Install dependencies

```bash
yarn install
```

### 2. Configure environment variables

Create a `.env` file in the project root and supply the required values:

```
GITHUB_TOKEN=ghp_your_personal_access_token
GITHUB_USERNAME=your-github-handle
OPENAI_API_KEY=your-openai-key
OPENAI_ORG=your-openai-org-id
OPENAI_PROJECT=your-openai-project-id
ORGANISATION=your-organisation
REPOSITORY=your-repository
SINCE_DATE=your-query-date
```

- `GITHUB_TOKEN` must have `repo` read permissions.
- `SINCE_DATE` in format YYYY-MM-DD

### 3. Run the diary generator

```bash
yarn dev-diary
```

This executes `dev-diary.ts`, which:

1. Searches GitHub for merged pull requests authored by `GITHUB_USERNAME` in `REPO` since your `START_DATE`
2. Sends each pull request to the OpenAI `gpt-4.1` model to generate a concise diary entry.
3. Writes the compiled entries to `developer-diary.md`.
