# Claude Agent Guide

IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning

- Use the shared post-room hook `./post-room.sh` to auto-run Prettier (`npm run format`) after a room.
- Run `npm run format` (or `npm run format:check`) before committing or pushing to avoid formatting-related CI failures.

## Environment

- Requires **Node >=24** (`.npmrc` has `engine-strict=true`); this env may have Node 22.
- Install/repair: `npm install --engine-strict=false`
- Broken node_modules: `rm -rf node_modules && npm install --engine-strict=false`

## Tech stack

SvelteKit + Svelte 5 (runes) + TypeScript + Vite. Prettier: tabs, single quotes,
no trailing commas, printWidth 100. Tests: Vitest (unit) + Playwright (e2e).

## Common npm scripts

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Type check | `npm run svelte:check` |
| Both type checks | `npm run typecheck` |
| Unit tests | `npm run test:unit` |
| E2E tests | `npm run test:e2e` |
| Screenshot tests | `npm run test:screenshots` |
| Lint | `npm run lint` / `npm run lint:fix` |
| Format | `npm run format` / `npm run format:check` |
| Icons | `npm run generate:icons` |

## Patterns & gotchas

- **UI/UX work**: consult Opus for an analysis/plan, then fan out parallel Sonnet
  agents (one per independent file) to implement. See the `ui-ux-review` skill.
- **CSS vars**: a missing custom property in `app.css :root` (e.g. `--color-primary-rgb`)
  breaks every `rgba(var(--…-rgb), …)` call **silently**. Keep all referenced vars declared.
- **Svelte 5**: use the `svelte` skill — fetch real docs via `npx @sveltejs/mcp`
  and run `svelte-autofixer` on edited components.
- **Browser verification**: use the `agent-browser` skill for manual checks.
- **Session learnings**: use the `session-review` skill at end of session to capture
  memories, skills, and settings updates before closing.

## TypeScript LSP

For richer TS navigation/diagnostics, use the `typescript-lsp` plugin from
`anthropics/claude-plugins-official`. There is no "TypeScript PSP plugin" — that
name does not exist. Install via the plugin marketplace:
```
/plugin marketplace add anthropics/claude-plugins-official
/plugin install typescript-lsp
```
