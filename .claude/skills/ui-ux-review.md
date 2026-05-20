---
name: ui-ux-review
description: Improve the pizza calculator's UI/UX using an Opus-analysis-then-parallel-Sonnet-implementation pattern. Use when the user asks to improve, redesign, or polish the UI/UX across multiple files.
---

# UI/UX Review & Implementation

Two-phase pattern validated on this project.

## Phase 1 — Analyze (Opus)

Consult `model: opus` agent with all relevant component code. Ask for:

- Prioritized improvement list (highest impact first)
- For each: what to change, exact file + element, and why
- CSS bugs (missing variables, broken declarations)
- Svelte 5 patterns that improve UX (transitions, animations)

Group planned changes so they touch **disjoint files** where possible.

## Phase 2 — Implement (parallel Sonnet fan-out)

Dispatch parallel Sonnet agents with `isolation: "worktree"`, one per independent
file group. Keep scopes non-overlapping to avoid conflicts.

## Phase 3 — Verify

1. `npm run svelte:check` — zero errors
2. `npm run test:unit` — all pass
3. `npm run format` — clean
4. Use `agent-browser` skill or `npm run test:screenshots` to eyeball results

## CSS gotcha

A missing custom property in `app.css :root` breaks every `rgba(var(--…), …)`
call **silently**. Before reviewing, grep:

```bash
grep -r 'var(--' src/ | grep -oP 'var\(--[^)]+\)' | sort -u
```

Confirm each referenced var is declared in `:root`.
