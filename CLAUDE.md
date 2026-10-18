# Claude Agent Guide

IMPORTANT: Prefer retrieval-led reasoning over pre-training-led reasoning

- Formatting runs automatically: a `PostToolUse` hook in `.claude/settings.json` runs Prettier on
  every file Claude writes or edits (see below), and the husky pre-commit hook runs `lint-staged`
  (Prettier + ESLint) on staged files.
- The husky pre-push hook runs `npm run format:check` and `npm run lint` and blocks the push if
  either fails. Edits made through the shell (`sed`, scripts) skip the `PostToolUse` hook, so run
  `npm run format` after them rather than finding out at push time.

## Environment

- Uses **Node 26** (`.nvmrc` is `26`; every workflow runs 26). Node 26 is LTS from 28 Oct 2026.
- Switch to the correct version: `nvm install 26 && nvm use` or `fnm use`.
- `package.json` `engines` deliberately stays at `>=24.0.0`. Dependabot's npm updater runs
  Node 24, and with `engine-strict=true` a floor of 26 makes every Dependabot update fail.
  Raise it only once Dependabot moves to 26 (`NODEJS_VERSION` in dependabot-core's
  `npm_and_yarn/Dockerfile`).
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
  agents (one per independent file) to implement. See the `ui-ux-review` skill.
- **CSS vars**: a missing custom property in `app.css :root` (e.g. `--color-primary-rgb`)
  breaks every `rgba(var(--…-rgb), …)` call **silently**. Keep all referenced vars declared.
- **Dark mode**: never hardcode hex literals (`#fff4f4`, `#ffb74d`, etc.) in component CSS —
  use CSS custom properties from `app.css :root`. Hardcoded colors silently break dark mode.
  Audit: `grep -rn '#[0-9a-fA-F]\{3,6\}' src/lib/components/`
- **A11y baseline**: global `:focus-visible` outline in `app.css`; all interactive elements
  need `min-height/width: 44px`; horizontal-scroll containers need `overflow-x: auto`
  (missing this makes last tabs unreachable on mobile).
- **Svelte 5**: use the `svelte` skill — fetch real docs via `npx @sveltejs/mcp`
  and run `svelte-autofixer` on edited components.
- **Browser verification**: use the `agent-browser` skill for manual checks.
- **Screenshots**: the Visual Comparison workflow diffs every PR's screenshots against its base
  pixel by pixel, using the PR's `screenshots.spec.ts` for both sides. That spec pins the clock,
  time zone, locale and service worker. A new screenshot of anything that depends on the current
  time, randomness or network state must be pinned there too, or it shows up as a diff on every PR.
- **Session learnings**: use the `session-review` skill at end of session to capture
  memories, skills, and settings updates before closing.
- **Skills vs memories**: conditional workflows (triggered by context) go in `.claude/skills/`
  as markdown files. Always-on facts go in `CLAUDE.md`. Official external skills are installed
  via `npx skills add <owner>/<repo>` into `.agents/skills/` with a symlink in `.claude/skills/`.

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
