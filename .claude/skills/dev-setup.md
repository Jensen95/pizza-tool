---
name: dev-setup
description: Get the project installed and runnable in this environment. Use when npm install fails on the engine check, node_modules is broken/missing, or the dev server won't start.
allowed-tools: Bash(npm install:*), Bash(rm -rf node_modules)
---

# Dev Setup

This project requires Node >=24 (`.npmrc` sets `engine-strict=true`), but the
environment may run Node 22. A plain `npm install` will fail the engine check.

## Install / repair

```bash
# Normal install (bypasses engine check)
npm install --engine-strict=false

# Broken node_modules
rm -rf node_modules && npm install --engine-strict=false
```

## Verify

```bash
npm run svelte:check   # type check
npm run test:unit      # 154 unit tests
npm run dev            # starts Vite at http://localhost:5173
```

## Common scripts

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Type check | `npm run svelte:check` |
| Unit tests | `npm run test:unit` |
| E2E tests | `npm run test:e2e` |
| Format | `npm run format` |
| Lint | `npm run lint` |
| All checks | `npm run typecheck` |
