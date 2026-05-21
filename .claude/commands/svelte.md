---
name: svelte
description: Author and fix Svelte 5 / SvelteKit code using the official Svelte MCP CLI for authoritative docs and runes autofixing. Use when writing or editing .svelte files, working with runes ($state/$derived/$effect/$props), or debugging Svelte 5 reactivity.
allowed-tools: Bash(npx @sveltejs/mcp:*)
---

# Svelte 5 + SvelteKit

This project uses Svelte 5 (runes mode) + SvelteKit + TypeScript. Prefer
retrieval over recall: fetch real docs before answering Svelte questions.

## Tools

- List doc sections:
  `npx @sveltejs/mcp list-sections`
- Fetch specific docs (comma-separated topics):
  `npx @sveltejs/mcp get-documentation "$state,$derived,$effect"`
- Analyze/autofix a component:
  `npx @sveltejs/mcp svelte-autofixer ./src/lib/Component.svelte`

## Workflow

1. Before writing non-trivial runes code, `get-documentation` for the relevant
   runes/APIs so you match current Svelte 5 semantics.
2. After editing a `.svelte` file, run `svelte-autofixer` on it and apply fixes.
3. Validate with `npm run svelte:check`.
4. Respect `.prettierrc`: tabs, single quotes, no trailing commas, printWidth 100.

## Svelte 5 quick-reference

- Use `$state` only for truly reactive vars; use `$state.raw` for large objects that are only reassigned
- Use `$derived` (expression) or `$derived.by` (function) instead of `$effect` for computed values
- `$effect` is an escape hatch — mostly avoid; never update state inside effects
- Props via `$props()`, not `export let`; treat as potentially changing → use `$derived` on prop-derived values
- Events: `onclick={...}` not `on:click={...}`
- Reusable markup: `{#snippet name()}...{/snippet}` + `{@render name()}` not `<slot>`
- Keyed each: `{#each items as item (item.id)}` — always key, never use index as key
- CSS custom props from JS: `style:--varname={value}` then `var(--varname)` in CSS
