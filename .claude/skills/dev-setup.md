---
name: dev-setup
description: Get the project installed and runnable in this environment. Use when npm install fails, node_modules is broken/missing, or the dev server won't start.
allowed-tools: Bash(npm install)
---

# Dev Setup

This project runs on **Node 26** (`.nvmrc` is `26`, `.npmrc` has `engine-strict=true`).
Use the correct Node version — do NOT skip the engine check with `--engine-strict=false`
or `--ignore-engines`. If the check fails, install the right Node version first.

## Switch Node version + install

```bash
nvm install 26   # if not yet installed
nvm use          # reads .nvmrc (Node 26)
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
