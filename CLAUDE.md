# Claude Agent Guide

IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning

- Use the shared post-room hook `./post-room.sh` to auto-run Prettier (`npm run format`) after a room.
- Run `npm run format` (or `npm run format:check`) before committing or pushing to avoid formatting-related CI failures.

## Environment

- Requires **Node 24** (`.nvmrc` is `24`, `.npmrc` has `engine-strict=true`).
- Switch to the correct version: `nvm install 24 && nvm use` or `fnm use`.
- Then install: `npm install`
- **Never** bypass with `--engine-strict=false` or `--ignore-engines` — install the right Node version instead.

## Tech stack

SvelteKit + Svelte 5 (runes) + TypeScript + Vite. Prettier: tabs, single quotes,
no trailing commas, printWidth 100. Tests: Vitest (unit) + Playwright (e2e).

## Common npm scripts

| Task             | Command                                   |
| ---------------- | ----------------------------------------- |
| Dev server       | `npm run dev`                             |
| Type check       | `npm run svelte:check`                    |
| Both type checks | `npm run typecheck`                       |
| Unit tests       | `npm run test:unit`                       |
| E2E tests        | `npm run test:e2e`                        |
| Screenshot tests | `npm run test:screenshots`                |
| Lint             | `npm run lint` / `npm run lint:fix`       |
| Format           | `npm run format` / `npm run format:check` |
| Icons            | `npm run generate:icons`                  |

## Patterns & gotchas

- **UI/UX work**: consult Opus for an analysis/plan, then fan out parallel Sonnet
  agents (one per independent file) to implement. See the `/ui-ux-review` command.
- **CSS vars**: a missing custom property in `app.css :root` (e.g. `--color-primary-rgb`)
  breaks every `rgba(var(--…-rgb), …)` call **silently**. Keep all referenced vars declared.
- **Dark mode**: never hardcode hex literals (`#fff4f4`, `#ffb74d`, etc.) in component CSS —
  use CSS custom properties from `app.css :root`. Hardcoded colors silently break dark mode.
  Audit: `grep -rn '#[0-9a-fA-F]\{3,6\}' src/lib/components/`
- **A11y baseline**: global `:focus-visible` outline in `app.css`; all interactive elements
  need `min-height/width: 44px`; horizontal-scroll containers need `overflow-x: auto`
  (missing this makes last tabs unreachable on mobile).
- **Svelte 5**: use the `/svelte` command — fetch real docs via `npx @sveltejs/mcp`
  and run `svelte-autofixer` on edited components.
- **Browser verification**: use the `/agent-browser` command for manual checks.
- **Session learnings**: use the `/session-review` command at end of session to capture
  memories, skills, and settings updates before closing.
- **Custom commands**: project slash commands live in `.claude/commands/*.md` — these are
  invokable as `/command-name`. Official external skills go in `.agents/skills/` via
  `npx skills add <owner>/<repo>`; they are NOT the same as `.claude/commands/` files.

## Formatting is automatic — don't hand-format generated code

The PostToolUse hook runs `prettier --write` on every written/edited file immediately.

- Don't spend tokens on indentation, quote style, or trailing commas — Prettier fixes them.
- Code must be **syntactically valid** — the hook silently no-ops on parse errors, leaving
  the file unformatted. Broken syntax won't be caught until lint/typecheck.
- When using the Edit tool, `old_string` must match the **current file content** (tabs, not
  spaces after the hook has run) — read the file first if unsure.
- Prettier only fixes formatting; ESLint logic errors still require `npm run lint`.

## TypeScript LSP

For richer TS navigation/diagnostics, use the `typescript-lsp` plugin from
`anthropics/claude-plugins-official`. There is no "TypeScript PSP plugin" — that
name does not exist. Install via the plugin marketplace:

```
/plugin marketplace add anthropics/claude-plugins-official
/plugin install typescript-lsp
```
