# Project: AI Chronicle (Static AI News Aggregator)

This repo is a production static site (Next.js App Router + TS + Tailwind + shadcn/ui) deployed on Cloudflare Pages.
The site fetches `public/feed.json` + `public/trending.json` at runtime (static hosting).

## Non-negotiables
- Must remain compatible with Next.js static export (`output: 'export'`), Cloudflare Pages output `out/`.
- No server-only features. No dynamic server routes.
- Never republish full article content. Show only metadata + short excerpt + outbound link + source attribution.

## Commands you MUST run before finishing
- `pnpm lint`
- `pnpm build`

If you touch feed logic:
- `pnpm update:feeds`

## UI goals
- Full-screen layout (uses full viewport width/height), scrollable, no clipped content.
- All navigation and buttons must do something real (no dead UI):
  - Top nav items: Home / Trending AI / Research / Opinion / Podcasts
  - Sidebar topic pills
  - Search input
  - Any CTA buttons (e.g., “Ask AI News”)
- Accessibility: keyboard focusable controls, visible focus ring, buttons are actual `<button>` and navigation uses `<a>`/`next/link`.

## Delegation / Subagent policy (IMPORTANT)
When a task can be split, do it in parallel by delegating to subagents.

Preferred order:
1) If native subagents/tasks are available in this Codex build, spawn 3–4 subagents:
   - UI/Layout Agent (full-screen + scroll + responsive layout)
   - Interaction Agent (nav buttons, topic pills, search wiring, link correctness)
   - QA Agent (add lightweight Playwright tests or checks; verify no dead controls)
   - Optional: Accessibility Agent (focus, aria, keyboard nav)
2) If native subagents are NOT available, emulate delegation by working in clearly separated phases:
   - Phase A: Layout changes only
   - Phase B: Interaction wiring only
   - Phase C: QA/tests only

Each agent/phase must:
- State what files it will touch
- Make minimal, focused diffs
- Report completion + how to verify

## Definition of Done for UI work
- Page uses full viewport and allows vertical scrolling on all devices.
- Clicking nav items either:
  - scrolls to the relevant section (`#trending`, `#latest`, etc.), OR
  - applies a filter state that changes visible content.
- Topic pills apply filters consistently.
- No dead buttons: every clickable element has a working handler or real link.
- Add at least one automated check (Playwright or simple test) that verifies key controls are clickable.
