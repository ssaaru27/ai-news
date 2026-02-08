# AI News Aggregator

Production-ready static AI news aggregator built with Next.js (App Router), TypeScript, Tailwind, and shadcn/ui components. It fetches curated RSS sources, normalizes + scores stories, and publishes static JSON assets consumed by the frontend.

## Features

- Static-export Next.js site (`output: "export"`) for Cloudflare Pages.
- Dark mode with `next-themes`.
- Client-side search and category filters.
- Auto-refresh in-browser every 5 minutes.
- Feed updater script with:
  - source config from `sources.json`
  - timeout + polite user agent
  - normalization and excerpt stripping
  - dedupe by canonical URL + GUID + normalized title
  - transparent scoring (recency decay + source weight + clustering boost)
  - output generation for `public/feed.json`, `public/trending.json`, `public/sitemap.xml`, `public/robots.txt`

## Project Structure

- `sources.json`: feed source config (RSS URL, category, optional weight).
- `scripts/update-feeds.ts`: feed ingestion + scoring pipeline.
- `public/feed.json`: full ranked feed (capped at ~500).
- `public/trending.json`: top ~30 stories from last 48h.
- `public/sitemap.xml` and `public/robots.txt`: generated from `SITE_URL`.

## Local Setup

1. Install dependencies:

```bash
pnpm install
```

2. Optionally set site URL:

```bash
# .env.local
SITE_URL=https://your-domain.example
```

3. Update feeds:

```bash
pnpm update:feeds
```

4. Run development server:

```bash
pnpm dev
```

5. Verify production quality checks:

```bash
pnpm lint
pnpm build
```

6. Run visual regression helper:

```bash
pnpm ui:diff
```

Artifacts are written to `.artifacts/current.png` and `.artifacts/diff.png`.

## Deploy to Cloudflare Pages

Use the following settings in Cloudflare Pages:

- Framework preset: `Next.js (Static HTML Export)` or `None`
- Build command: `pnpm install --frozen-lockfile && pnpm update:feeds && pnpm build`
- Build output directory: `out`
- Environment variable:
  - `SITE_URL=https://your-production-domain.example`

## Scheduled Feed Updates

GitHub Actions workflow: `.github/workflows/update-feeds.yml`

- Runs every 2 hours and on manual dispatch.
- Uses `pnpm update:feeds`.
- Commits and pushes only when generated outputs changed.
- Commit message: `chore: update feeds`.
- Uses workflow concurrency to prevent overlapping runs.
