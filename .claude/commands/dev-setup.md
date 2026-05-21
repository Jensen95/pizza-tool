---
name: dev-setup
description: Get the project installed and runnable in this environment. Use when npm install fails, node_modules is broken/missing, or the dev server won't start.
allowed-tools: Bash(npm install)
---

# Dev Setup

This project requires **Node 24** (`.nvmrc` is `24`, `.npmrc` has `engine-strict=true`).
Use the correct Node version — do NOT skip the engine check with `--engine-strict=false`
or `--ignore-engines`. If the check fails, install the right Node version first.

## Switch Node version + install

```bash
nvm install 24   # if not yet installed
nvm use          # reads .nvmrc (Node 24)
# or: fnm use
npm install
```

## Verify

```bash
npm run svelte:check   # type check
npm run test:unit      # unit tests
npm run dev            # starts Vite at http://localhost:5173
```

## Common scripts

| Task       | Command                |
| ---------- | ---------------------- |
| Dev server | `npm run dev`          |
| Type check | `npm run svelte:check` |
| Unit tests | `npm run test:unit`    |
| E2E tests  | `npm run test:e2e`     |
| Format     | `npm run format`       |
| Lint       | `npm run lint`         |
| All checks | `npm run typecheck`    |

## Installing official skills

Skills (slash commands) from external repos are installed via:

```bash
npx skills add <owner>/<repo>
# example: npx skills add vercel-labs/agent-browser
```

This installs to `.agents/skills/<name>/` and creates a symlink in `.claude/skills/`.
Custom project skills live in `.claude/commands/` as markdown files.
