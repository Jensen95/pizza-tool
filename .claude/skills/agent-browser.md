---
name: agent-browser
description: Drive a real browser for verifying the pizza calculator PWA — navigate, click, fill, read DOM, screenshot. Use when you need to manually verify UI/UX changes, reproduce a visual bug, or check PWA behavior in a live browser.
allowed-tools: Bash(agent-browser:*), Bash(npx agent-browser:*)
---

# agent-browser

Rust CLI for browser automation (vercel-labs/agent-browser). Install once:

```bash
npx skills add vercel-labs/agent-browser
npm install -g agent-browser && agent-browser install --with-deps  # Linux
```

## Core workflow

1. Start the app: `npm run dev` — note the Vite dev server URL (usually http://localhost:5173)
2. Navigate: `agent-browser open <url>`
3. Snapshot (get interactive element refs): `agent-browser snapshot -i`
   — returns numbered refs like `@e1`, `@e2`
4. Interact using refs:
   - `agent-browser click @e2`
   - `agent-browser fill @e3 "value"`
   - `agent-browser screenshot` (add `--annotate` to label refs)
5. After page changes, re-snapshot for fresh refs

## Key commands

`open`, `goto`, `click`, `fill`, `type`, `scroll`, `snapshot`, `screenshot`,
`get text`, `get html`, `get title`, `get url`

## Notes

- Use `--json` flag for machine-readable output
- Use `agent-browser batch` to chain operations in one call
- Prefer this for one-off manual verification; for regression coverage use
  Playwright: `npm run test:e2e`, `npm run test:screenshots`
