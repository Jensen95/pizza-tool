# Pizza Tool — UI Redesign & Theme System Plan

**Status:** Decision document. Phase 0 (production fixes, §7) and Phase 0.5 (cheap hardening, §7.5) are **APPROVED scope** — the repo owner has signed off on folding the audit's confirmed findings in as committed pre-work. Themes, UI proposals, and the Dough Log feature (§§2–5) remain pending owner decisions (see §6). **Update:** Dough Log approved; Light/Dark primary under review (red retired outside Italiano) — see §3.5 and §6 decision 1/10.
**Date:** 2026-07-18
**Author:** Design lead
**Scope:** Theme/token architecture, screen-level UI improvements, and a new Dough Log feature.

---

## 1. Current state — honest assessment

Today's UI is a competent, mobile-first Material-flavoured PWA that works but reads as a generic red-accented app template rather than something with a point of view.

**Theming (grounded in `src/app.css` + css-map):**

- One flat token layer in `:root`: `--color-primary` (`#d32f2f` Material Red 700), `--color-background` (`#fafafa`), `--color-surface` (`#ffffff`), `--color-text` (`#212121`), plus success/warning/error, spacing, radius, shadow, type, and layout tokens. This is a solid, well-tokenized base.
- Dark mode exists **only** via `@media (prefers-color-scheme: dark)` (app.css lines 295–308). It overrides background/surface/text/border/shadow/warning, but **not** primary, success, or error — those are reused as-is on dark.
- **The theme preference is dead wiring.** `preferences.ts` stores `theme: 'light' | 'dark' | 'system'` and exposes `setTheme()`, but nothing ever reads it and nothing sets a `data-theme` attribute on `<html>`. A user who picks "dark" in a settings screen would see no effect — the OS preference is the only thing that matters today.
- **No user-facing theme switcher exists at all.**
- **`theme-color` meta is hardcoded** to `#d32f2f` (app.html line 6) and never changes with theme.

**Hardcoded-color debt (the migration targets):**

| File | Line(s) | Offender | Nature |
| --- | --- | --- | --- |
| `src/app.css` | 173 | `.btn-secondary:hover { background: #d0d0d0 }` | **Real bug** — no dark-mode override; light-grey hover on a dark surface |
| `src/lib/components/ui/PwaPrompts.svelte` | 244 | `outline: 2px solid var(--color-primary, #007bff)` | Fallback only; blue, off-brand |
| `src/lib/components/timer/NotificationPermissionBanner.svelte` | 94–95, 160 | `#fff3e0`, `#ffb74d`, `#007bff` fallbacks | Fallback-only; won't adapt to dark |

That is the entire hardcoded-hex surface — small and tractable. The codebase is already ~95% tokenized, which makes a proper multi-theme system cheap to add.

**Verdict:** Good bones, no soul, and a half-built theming feature that promises more than it delivers. The redesign's job is to (a) finish and generalize the theme system into something explicitly switchable, (b) add a little culinary personality, and (c) sharpen a few screens that the ui-map flagged as rough.

---

## 2. Style-guide source: nostromo-ui & iamjarl-design

Both are public repos by **JarlLyng**. We will **not install either package** — pizza-tool is SvelteKit and nostromo-ui is a React/Tailwind library; iamjarl-design is a token-only package for a different product family. We borrow **token values and patterns** only. Both research fetches **succeeded** — the values below are real, quoted from the source CSS/JSON, not invented.

### 2.1 nostromo-ui (`JarlLyng/nostromo-ui`)

A production React + Tailwind component library. Its central idea worth stealing: **theme = a `[data-theme="<name>"]` attribute on the root**, each theme a full token set, with dark handled by a second `[data-color-scheme="dark"]` attribute. Four Alien-franchise themes:

| Theme | Brand hue | Primary (light) | Background (light) | Mood |
| --- | --- | --- | --- | --- |
| `nostromo` (default) | 262° violet | `#691eeb` | `#fafafa` | Clean technical sci-fi dashboard |
| `mother` | 195° cyan | `#00bfff` | `#ffffff` | Cold, clinical, high-key AI terminal |
| `lv-426` | 25° orange/rust | `#f96b06` | `#fbfaf9` | Warm, rustic, gradient-heavy marketing look |
| `sulaco` | 210° steel blue | `#4d7fb2` | `#fafafa` | Desaturated professional/military ops console |

Selected concrete `lv-426` light tokens (the warm theme closest to pizza's palette; HSL as authored, hex approx):

| Token | HSL | Hex |
| --- | --- | --- |
| `--color-background` | `30 20% 98%` | `#fbfaf9` |
| `--color-foreground` | `30 20% 10%` | `#1f1a14` |
| `--color-muted` | `30 20% 95%` | `#f5f2f0` |
| `--color-border` | `30 20% 90%` | `#ebe6e0` |
| `--color-primary` | `25 95% 50%` | `#f96b06` |
| `--color-accent` | `25 95% 90%` | `#fee1cd` |
| `--color-destructive` | `0 80% 50%` | `#e61919` |

Notable nostromo patterns we adopt: full semantic token layer (background/foreground/muted/card/border/primary/accent/destructive/ring + `-foreground` pairings), WCAG-AA contrast validated in-source, and the `lv-426` neutral trick of a **warm-tinted grey** (`30° 20%`, not true grey) — directly useful for the "Italiano" theme's cream surfaces. We **do not** adopt: HSL-triple authoring for Tailwind, gradient buttons, or the Alien naming.

### 2.2 iamjarl-design (`JarlLyng/iamjarl-design`)

A machine-readable **design-token package** (no components). Two modes only — **Light** and **Dark** — switched by `prefers-color-scheme` or a `.light`/`.dark` class. CSS vars prefixed `--ij-`. Its signature move: the **accent flips hue between modes** (purple in light, neon chartreuse in dark), not just lightness.

Light mode (selected):

| Token | Var | Value |
| --- | --- | --- |
| primary | `--ij-color-primary` | `#A435D2` (bold purple/magenta) |
| text.primary | `--ij-color-text-primary` | `#000000` |
| text.secondary | `--ij-color-text-secondary` | `rgba(0,0,0,0.70)` |
| background.app | `--ij-color-bg-app` | `#FFFFFF` |
| background.card | `--ij-color-bg-card` | `rgba(0,0,0,0.04)` |
| surface.raised | `--ij-color-surface-raised` | `rgba(0,0,0,0.02)` |
| border.subtle | `--ij-color-border-subtle` | `rgba(0,0,0,0.10)` |
| border.default | `--ij-color-border-default` | `rgba(0,0,0,0.16)` |
| state.success | `--ij-color-state-success` | `#2E7D32` |
| state.warning | `--ij-color-state-warning` | `#C2410C` |
| state.error | `--ij-color-state-error` | `#D70015` |

Dark mode (selected):

| Token | Value |
| --- | --- |
| primary | `#D0FF00` (neon chartreuse) |
| text.primary | `#FFFFFF` |
| background.app | `#000000` |
| background.card | `rgba(255,255,255,0.05)` |
| border.subtle | `rgba(255,255,255,0.12)` |
| state.success / warning / error | `#4CAF50` / `#FF6B35` / `#FF453A` |

Patterns we adopt from iamjarl: **graded-opacity text hierarchy** (100/70/55/35% in light; 100/75/60/35% in dark) instead of hand-picked greys; **translucent washes over hard borders** for cards (`rgba(0,0,0,0.04)`); **separate "fill" vs "AA-safe text" state colors** (their design.md warns raw `#4CAF50` success on white is only 2.78:1 — fails AA — hence the darker `#2E7D32` text variant); strict **`on*` color pairing** for text on colored fills; a 2px/2px focus ring in the mode's primary. Shared scale references: radius 8/12/16px, spacing 4/8/12/16/20/24/32, shadows `0 1px 2px rgba(0,0,0,.05)` / `0 4px 8px rgba(0,0,0,.08)` / `0 8px 24px rgba(0,0,0,.12)`.

**Net:** nostromo gives us the multi-theme **architecture** and warm-neutral values; iamjarl gives us the **contrast discipline** (opacity ladders, AA-safe state text, on-colors). Both reinforce our own `app.css` structure rather than replacing it.

---

## 3. Proposed theme system

### 3.1 Architecture

Keep `app.css` custom properties as the single token contract. Every component already reads `var(--color-*)`, so switching themes means **only re-declaring those variables under a selector** — no component churn beyond the hardcoded-hex fixes in §1.

Adopt nostromo's attribute model, simplified to one attribute:

```
:root                      → Light theme token values (default, unchanged names)
:root[data-theme="dark"]   → Dark
:root[data-theme="grey"]   → Grey (neutral, low-chroma)
:root[data-theme="italiano"] → Italiano (fun accent theme)
```

Plus a **system-following default**: when the user's stored preference is `system`, no `data-theme` is set and the existing `@media (prefers-color-scheme: dark)` block continues to drive Light↔Dark automatically. A concrete theme choice (`dark`/`grey`/`italiano`/`light`) sets `data-theme` explicitly and wins over the media query.

**New token names to add** (superset of today's, so nothing breaks): `--color-surface-elevated` (cards that sit above other cards — modals, popovers, history panel), `--color-text-tertiary` (the 55% step), `--color-accent` + `--color-accent-contrast`, and `on*` contrast tokens `--color-on-primary`, `--color-on-accent`. Existing names (`--color-primary`, `--color-surface`, `--color-text`, `--color-text-secondary`, `--color-border`, `--color-success/warning/error`) keep their meaning.

### 3.2 Persistence & system preference

- `preferences.theme` type widens from `'light' | 'dark' | 'system'` to `'light' | 'dark' | 'grey' | 'italiano' | 'system'` (backward-compatible: `preferences.ts` already merges over defaults, so old stored values survive — store-map §3 confirms this is the safest key in the app).
- `+layout.svelte` gains a small `$effect`/subscription: on `$preferences.theme` change, if value is `system` remove `data-theme` from `document.documentElement`; else set it. This is the missing wiring css-map flagged.
- Also update the `theme-color` meta dynamically to the active theme's `--color-primary` (fixes the hardcoded `#d32f2f`).
- A theme switcher UI (segmented control: Light / Dark / Grey / Italiano / System) lands on a small **Settings** surface — simplest home is the Reference screen or a new gear in the header (owner decision, §6).

### 3.3 Migration path for hardcoded colors

1. `app.css:173` — replace `background: #d0d0d0` with `background: var(--color-border)` (already the `.btn-secondary` base; hover can darken via a new `--color-border-strong` token, or simply reuse `--color-text-secondary` at low opacity). **Required** — this is the one true dark-mode bug.
2. `PwaPrompts.svelte:244` and `NotificationPermissionBanner.svelte:94–95,160` — the CSS-var fallbacks are only used if vars fail to load (edge case), but change the fallback literals from blue/orange to the app's own values so they're on-brand even in the degenerate case. **Low priority.**
3. Add a CI guard (optional): the CLAUDE.md audit grep `grep -rn '#[0-9a-fA-F]\{3,6\}' src/lib/components/` as a lint step so new hardcoded hex can't creep in.

### 3.4 Proposed token tables

All four grounded in `app.css` today plus nostromo/iamjarl values where they fit. State colors follow iamjarl's fill-vs-text discipline; text hierarchy follows the opacity ladder.

#### Light (default — largely today's values, formalized)

| Token | Value | Source note |
| --- | --- | --- |
| `--color-background` | `#fafafa` | unchanged |
| `--color-surface` | `#ffffff` | unchanged |
| `--color-surface-elevated` | `#ffffff` + `--shadow-md` | new; modals/popovers |
| `--color-text` | `#212121` | unchanged |
| `--color-text-secondary` | `#757575` | unchanged (~70% black) |
| `--color-text-tertiary` | `rgba(0,0,0,0.55)` | new; iamjarl ladder |
| `--color-primary` | TBD — candidate under review | red is confined to Italiano; see §3.5 for the seven candidates the owner is reviewing |
| `--color-on-primary` | `#ffffff` | new |
| `--color-accent` | `#2e7d32` | basil green, AA-safe as text (iamjarl `state.success` text value) |
| `--color-on-accent` | `#ffffff` | new |
| `--color-success` | `#2e7d32` | darkened from `#4caf50` for AA text (iamjarl fix) |
| `--color-warning` | `#c2410c` | AA-safe warn text (iamjarl) |
| `--color-error` | `#d70015` | iamjarl error |
| `--color-border` | `#e0e0e0` | unchanged |

#### Dark

| Token | Value | Source note |
| --- | --- | --- |
| `--color-background` | `#121212` | today's dark |
| `--color-surface` | `#1e1e1e` | today's dark |
| `--color-surface-elevated` | `#2a2a2a` | new; one step above surface |
| `--color-text` | `#e8e8e8` | today's dark |
| `--color-text-secondary` | `rgba(255,255,255,0.60)` | iamjarl ladder |
| `--color-text-tertiary` | `rgba(255,255,255,0.40)` | new |
| `--color-primary` | TBD — candidate under review | red is confined to Italiano; see §3.5 for the seven candidates the owner is reviewing |
| `--color-on-primary` | `#1a1a1a` | new |
| `--color-accent` | `#66bb6a` | brightened basil |
| `--color-success` | `#4caf50` | iamjarl dark success |
| `--color-warning` | `#ff6b35` | iamjarl dark warn |
| `--color-error` | `#ff453a` | iamjarl dark error |
| `--color-border` | `#333333` | today's dark |

#### Grey (neutral / low-chroma — for focus, prints, colorblind-friendly)

| Token | Value | Source note |
| --- | --- | --- |
| `--color-background` | `#f4f4f5` | true-grey, sulaco-style neutral |
| `--color-surface` | `#ffffff` | — |
| `--color-surface-elevated` | `#fafafa` | — |
| `--color-text` | `#1a1a1a` | — |
| `--color-text-secondary` | `rgba(0,0,0,0.62)` | ladder |
| `--color-text-tertiary` | `rgba(0,0,0,0.45)` | — |
| `--color-primary` | `#3f3f46` | graphite (accent = grey, near-monochrome UI) |
| `--color-on-primary` | `#ffffff` | — |
| `--color-accent` | `#52525b` | secondary graphite |
| `--color-success` | `#2e7d32` | kept for meaning even in grey theme |
| `--color-warning` | `#b45309` | — |
| `--color-error` | `#b91c1c` | — |
| `--color-border` | `#d4d4d8` | — |

#### Italiano (fun — pomodoro red / basil green / mozzarella cream)

The personality theme. Cream canvas (borrowed from lv-426's warm neutral `30° 20%`), tomato-red primary, basil-green accent — tastefully as accents, not a circus. Text stays near-black on cream for readability.

| Token | Value | Source note |
| --- | --- | --- |
| `--color-background` | `#fbf7ef` | mozzarella cream (lv-426 warm neutral direction) |
| `--color-surface` | `#fffdf8` | lighter cream card |
| `--color-surface-elevated` | `#ffffff` | — |
| `--color-text` | `#2a1f18` | warm near-black (lv-426 `30 20% 10%` family) |
| `--color-text-secondary` | `rgba(42,31,24,0.66)` | warm ladder |
| `--color-text-tertiary` | `rgba(42,31,24,0.48)` | — |
| `--color-primary` | `#c8362f` | pomodoro red (slightly warmer than Material red) |
| `--color-on-primary` | `#fffdf8` | cream, not pure white |
| `--color-accent` | `#3f7d3a` | basil green |
| `--color-on-accent` | `#fffdf8` | — |
| `--color-success` | `#3f7d3a` | basil doubles as success |
| `--color-warning` | `#c2410c` | terracotta warn |
| `--color-error` | `#b3261e` | deep tomato |
| `--color-border` | `#ece2d2` | warm tan border (lv-426 `30 20% 90%` ≈ `#ebe6e0`) |

Italiano dark variant (`:root[data-theme="italiano"]` inside a `prefers-color-scheme: dark` block, optional) can drop to an espresso-brown canvas `#1c1613` with the same tomato/basil accents brightened — deferred unless owner wants it (§6).

### 3.5 Light/Dark primary — candidates (owner reviewing in HTML preview)

Owner decision: Light and Dark themes will **not** keep the Material-red primary. Red is confined to Italiano — Italiano keeps pomodoro `#c8362f` (§3.4) as the app's only red primary, and Grey keeps its graphite primary unchanged. The Light/Dark `--color-primary` rows in §3.4 are **TBD** pending the owner's review of the seven candidates below in an HTML preview.

| Candidate | Light | Dark | Trade-offs |
| --- | --- | --- | --- |
| **Basil green** *(recommended)* | `#2e7d32` | `#66bb6a` | Promoted from today's `--color-accent`. Accent then becomes a warm crust-tan (`~#9c5a2c` light / `~#d9a05b` dark). Reuses an already AA-validated value (iamjarl success text) — low risk, calm, food-appropriate — but shares its hue family with `--color-success`, so the accent swap needs to fully separate the two meanings visually. |
| Crust orange | `~#ea580c` | brightened (from nostromo `lv-426` `#f96b06`) | Warm and appetizing, but close to `--color-warning`; warning would need to shift to amber (`~#b45309` light / `~#f59e0b` dark) to avoid clashing. |
| Steel blue family | `#4d7fb2` (darkened for AA in light) | `#4d7fb2` family | Sourced from nostromo `sulaco`. Cool, professional "ops console" mood — furthest from a pizza/culinary feel of the set; needs darkening to clear AA on light backgrounds. |
| Warm graphite | `~#4a4038` | `~#d6cec4` | Near-monochrome; the primary carries almost no color, pushing the meaning-bearing color budget onto success/warning/error. Safest for a11y/colorblind users, least "branded." |
| Nostromo violet | `#691eeb` | `#691eeb` (as authored) | nostromo's own default-theme primary. Distinctive, but no inherent link to pizza/Italian styling — a purely borrowed hue. |
| Mother cyan | `#00bfff` (darkened for AA in light) | `#00bfff` | nostromo `mother` theme's signature cyan. Cold/clinical mood, furthest from Italiano's warmth; needs darkening to pass AA on light backgrounds. |
| iamjarl flip | `#A435D2` | `#D0FF00` | Accent-flip pattern — hue changes between modes, not just lightness. Most novel option, but highest implementation/testing cost: two unrelated hues, each needing AA validation and harmonization with success/warning/error in both modes. |

Note: `--color-success`, `--color-warning`, `--color-error`, and all neutral tokens (background/surface/text/border) in §3.4 are **unaffected** by this choice — only `--color-primary` (and, if the "promoted" pattern is chosen, `--color-accent`/`--color-on-primary`/`--color-on-accent`) moves.

---

## 4. UI redesign proposals

Three proposals, each independently accept/reject. All grounded in ui-map rough edges. None require the theme work to ship first, but all benefit from it.

### Proposal A — Navigation & global chrome polish  *(decision: accept / reject)*

- **Add the theme switcher** (§3.2) — the single highest-leverage change; it activates work that's currently invisible.
- **Header**: keep the sticky primary-color bar, but move the keep-awake toggle out of the recipe page's back-link area (ui-map rough edge #10 — it's global but looks recipe-specific) into the header or Settings, so its global scope reads correctly.
- **Bottom nav** (ui-map): already solid (4 tabs, active-color, timer badge). Minor: give the active tab a subtle top-border or filled pill using `--color-accent` so active state doesn't rely on color alone (a11y — supports the Grey theme and colorblind users).
- **Filter bar** (rough edge #2): add a 1px `--color-border` bottom edge + `--color-surface` background to the sticky recipe-list filter bar so it visually separates from scrolling content instead of floating.

### Proposal B — Recipe detail & calculator legibility  *(decision: accept / reject)*

The densest screen (ui-map §2, rough edges #3, #4, #7). Proposals:

- **Collapsible ingredient stages** (rough edge #3): the flat ingredient list grows long on mobile. Group `IngredientCalculator` output by mixing stage into collapsible sections (poolish / biga / main…), collapsed-by-default past the first stage. Reuses the existing history-panel slide pattern.
- **Fermentation timeline density** (rough edge #7): keep the vertical-line timeline but make per-step ingredient lists collapsible, and add the `--color-accent` dot for steps that can set a timer, so the actionable steps stand out.
- **Baker-% clarity** (rough edge #4): the "original % → custom %" display and tiny reset buttons are opaque to non-bakers. Add a one-line inline hint and enlarge reset hit targets to the 44px baseline (some inputs currently rely only on `.btn`; css-map notes inputs/selects aren't guaranteed 44px).
- **Stat tiles**: restyle the three header stats (hydration / total time / base weight) as `--color-surface-elevated` tiles with `--color-text-tertiary` labels — small, high-polish, theme-driven.

### Proposal C — Tools, timers & destructive-action safety  *(decision: accept / reject)*

- **DoughPlanner warnings** (rough edge #8): warnings currently render as plain inline text. Wrap them in the existing `--color-warning-bg` / `--color-warning-border` treatment with a warning icon so they read as warnings.
- **Confirmation on destructive actions** (rough edge #9): deleting history entries and "Ryd alle" completed timers have no confirm. Add a lightweight inline confirm (tap-to-confirm on the X, or an undo toast). This also sets up the Dough Log's delete affordance (§5).
- **Timer progress direction** (rough edge #5): progress bar fills but direction is ambiguous. Add the remaining-time as the fill label and a subtle color shift toward `--color-warning` as it nears completion.
- **Reference tab overflow indicator** (rough edge #6): 6 tabs scroll horizontally with no affordance. Add a right-edge fade mask so users know more tabs exist (CLAUDE.md a11y note: horizontal-scroll containers need `overflow-x: auto` — verify present).

---

## 5. New feature — Dough Log (bake journal)

Records what actually happened on a given bake versus what the recipe/plan prescribed, attaches it to a recipe (optionally a dough plan), persists it, and surfaces past bakes on the recipe detail screen ("last time you used 5% less water").

### 5.1 Where it lives (grounded in store-map)

- **New store** `src/lib/stores/dough-log.ts`, **new localStorage key** `pizza-tool-dough-log`, modeled **exactly** on `dough-plans.ts` / `recipeHistory` (store-map §5.5): a single `writable<DoughLogEntry[]>`, newest-first, hard cap 50 via `.slice(0, 50)`, immutable records (`add`/`delete`/`clear`, **no edit** — matches both existing capped-array precedents).
- **Do not** extend the dead `customizations` store (store-map §3 confirms it's unused dead weight). **Do not** overload `recipeHistory` — that's a live calculator-restore log with a different job; sit beside it.
- Snapshot enough recipe context (`recipeName`, `category`, base `hydration`) at save time so entries stay meaningful if the static recipe JSON later changes — store-map §6 flags there is **no `recipeId` referential integrity** anywhere.
- **Precious-data caveat** (store-map §6): a bake log is harder to reconstruct than a recomputed override. This is the first feature where silent `storage.set` failure is genuinely unacceptable — the store should check the boolean return of `storage.set` and surface a toast on failure (small deviation from the app's swallow-everything convention).
- **Small model change**: `TimelineStep` has no stable `id` (store-map §4), only an optional `section`. To reference a fermentation step for a "shorter/longer" deviation, either add an optional `id` to `TimelineStep` in `models/recipe.types.ts`, or reference by array index + snapshot of planned `duration`/`location`. Recommend the index+snapshot approach (no model change, survives reordering gracefully as a copy).

### 5.2 Data model (TypeScript)

```ts
// src/lib/models/dough-log.types.ts
export interface IngredientDeviation {
	ingredientId: string; // reuses the RecipeIngredient/FlatIngredient id space
	label: string; // snapshot of ingredient name at bake time
	kind: 'added' | 'omitted' | 'changed';
	plannedPct?: number | null; // baker % the recipe/calculator prescribed
	actualPct?: number | null; // what the baker actually used
}

export interface FermentationDeviation {
	stepIndex: number; // index into recipe.timeline (no stable id — snapshot instead)
	stepLabel: string; // snapshot of instructions/section at bake time
	plannedMinutes?: number | null;
	actualMinutes?: number | null;
	plannedLocation?: 'room' | 'fridge' | 'warm' | null;
	actualLocation?: 'room' | 'fridge' | 'warm' | null;
	tempNote?: string; // e.g. "kitchen was 26°C, ran fast"
}

export interface DoughLogEntry {
	id: string; // crypto.randomUUID() with Date.now() fallback (matches dough-plans)
	recipeId: string; // loose FK, no integrity guarantee
	recipeName: string; // snapshot for resilience
	recipeCategory?: string; // snapshot
	doughPlanId?: string; // optional link to a SavedDoughPlan
	numberOfPizzas: number; // snapshot of calculator inputs
	doughBallWeight: number;
	hydration?: number | null; // effective values at bake time
	predoughRatio?: number | null;
	ingredientDeviations: IngredientDeviation[];
	fermentationDeviations: FermentationDeviation[];
	notes?: string; // free-form
	outcome?: 1 | 2 | 3 | 4 | 5; // star rating, optional
	bakedAt: string; // ISO — when the bake happened (may differ from createdAt)
	createdAt: string; // ISO — when the log was written
}
```

Optional fields are defaulted at read time (the `leavening?` pattern, store-map §2) — no migration harness exists to lean on, so every new field must be additive/optional.

### 5.3 Store API (mirrors dough-plans.ts)

```ts
doughLog.add(entry: Omit<DoughLogEntry, 'id' | 'createdAt'>): DoughLogEntry
doughLog.delete(id: string): void
doughLog.clear(): void
doughLog.getForRecipe(recipeId: string): DoughLogEntry[] // derived filter
```

### 5.4 Entry UI flow

Two entry paths (owner picks one or both, §6):

1. **Quick-log prompt after a bake (recommended primary path).** `DoughControls.svelte`'s existing `saveCustomRecipe()` is the one spot where a user commits "this is what I actually did" (store-map §5.2) — it already has `recipe`, `getCustomIngredients()`, `numberOfPizzas`, `doughBallWeight`, `hydrationOverride`, `predoughOverride` in scope. After saving to history, offer "Log this bake?" → a compact sheet pre-filled with the deviations the calculator can already infer (ingredient % vs recipe default, effective hydration vs base hydration). User adds temperature notes, a rating, free-form notes, taps save.
2. **Manual entry.** A "Log en bagning" button on the recipe detail screen opens the same sheet empty, for logging a bake done away from the app.

The sheet reuses `--color-surface-elevated`, the slide-in pattern from the history panel, and the confirm-on-delete affordance from Proposal C.

### 5.5 How past logs surface

- **Recipe detail screen**: a "Tidligere bagninger (N)" collapsible section beside the existing Historik panel (ui-map §2). Each entry shows date, rating, and a one-line deviation digest.
- **The "last time" nudge**: when the calculator is open for a recipe with prior logs, show an inline hint derived from the most recent entry — e.g. *"Sidste gang brugte du 5% mindre vand"* / *"last time you used 5% less water"* — computed by diffing the latest `DoughLogEntry.hydration` against the current effective hydration. Non-blocking, dismissible.
- **Optional**: a global "Bagedagbog" (bake journal) view listing all logs across recipes, if the owner wants it as a first-class surface (§6) — otherwise it stays per-recipe.

---

## 6. Open decisions

Decisions 1–15 below still stand as-is for themes, UI proposals, and the Dough Log (§§2–5) — none of that is scheduled or approved yet. The production fixes from the audit are **no longer decisions**: the owner has approved them as Phase 0 / Phase 0.5 pre-work (§7, §7.5) regardless of how 1–15 resolve.

The owner must decide each of these before implementation:

1. ~~**Default theme** — which of Light / Dark / Grey / Italiano / System is the out-of-box default?~~ **Superseded.** Red-outside-Italiano is ruled out — Italiano keeps pomodoro `#c8362f` as the app's only red primary, Grey keeps graphite. The real remaining choice is now two-part: (a) which Light/Dark primary candidate from §3.5 to lock in, and (b) which of Light / Dark / Grey / Italiano / System is the out-of-box default. (Recommendation unchanged on (b): `system`, preserving today's behavior, Italiano as an opt-in personality; on (a): basil green, §3.5 — pending owner sign-off in the HTML preview.)
2. **Ship all four themes, or a subset?** — e.g. Light + Dark + Italiano and drop Grey, or Light + Dark only for v1 with Grey/Italiano later.
3. **Italiano dark variant** — build the espresso-brown dark Italiano now, or defer? (§3.4)
4. **Theme switcher location** — header gear icon, a new Settings screen, or tucked into the Reference tab? (§3.2)
5. **State-color AA fix** — adopt iamjarl's darker AA-safe success/warning values (`#2e7d32`/`#c2410c`) now (changes today's greener `#4caf50`/`#ff9800`), or keep current values? (§3.4)
6. **Hardcoded-hex CI guard** — add the grep lint step, or fix the three offenders once and move on? (§3.3)
7. **Redesign Proposal A** (nav/chrome + theme switcher) — accept / reject.
8. **Redesign Proposal B** (recipe detail & calculator legibility) — accept / reject, and if partial, which sub-items.
9. **Redesign Proposal C** (tools/timers/destructive-action safety) — accept / reject, and if partial, which sub-items.
10. ~~**Dough Log — ship it?** — accept / reject the feature as a whole.~~ ✅ **DECIDED — YES.** Owner approved shipping the Dough Log feature (§5) as a whole.
11. **Dough Log entry paths** — quick-log-after-bake only, manual-only, or both? (§5.4)
12. **Dough Log `TimelineStep` reference** — add a stable `id` to `TimelineStep` in the model, or use the index+snapshot approach? (§5.1; recommendation: index+snapshot, no model change.)
13. **Dough Log outcome rating** — include the 1–5 star rating, or keep entries note-only?
14. **Dough Log global view** — per-recipe surfacing only, or also a global "Bagedagbog" journal screen? (§5.5)
15. **Dough Log storage failure handling** — add the toast-on-`storage.set`-failure deviation from the swallow-everything convention (recommended for precious data), or keep silent-degrade parity with the rest of the app? (§5.1)

**Note on 11–15:** now that the Dough Log itself is approved (decision 10), these five sub-decisions remain open — but absent an explicit owner objection, the plan's stated defaults apply as the working assumption: both entry paths with quick-log-after-bake as the primary one (11, §5.4); index+snapshot for the `TimelineStep` reference rather than a model change (12, §5.1); the 1–5 star rating included, as already specced in `DoughLogEntry.outcome` (13, §5.2); per-recipe surfacing only for now, with the global "Bagedagbog" view left as a future optional add-on (14, §5.5); and toast-on-`storage.set`-failure rather than silent-degrade, given the precious-data caveat (15, §5.1).

---

## 7. Phase 0 — Production fixes (approved scope)

The owner has approved folding all 8 CONFIRMED findings from `docs/redesign/AUDIT.md` into the plan as committed pre-work, independent of how §6's theme/UI/Dough-Log decisions land. Each item below is a fix, not a decision — implementation can start without waiting on §6.

### 7.1 storage.set() failures are swallowed everywhere

- **File**: `src/lib/utils/storage.ts:37`
- **Fix approach**: Change `storage.set()`'s callers, not its signature — it already returns a boolean, nothing reads it. Add a small `storageFailure` writable (or a callback param threaded through `storage.set`) that every persisting store (`dough-plans.ts`, `preferences.ts`, `customizations.ts`, `timer-manager.ts`, `calculator.ts`) checks after each write. Surface one global "changes couldn't be saved" toast/banner from that single store rather than duplicating UI per caller.

### 7.2 Corrupted/partial localStorage treated as "never saved"

- **File**: `src/lib/utils/storage.ts:25`
- **Fix approach**: In `get<T>()`, distinguish `item === null` (genuinely missing) from a `JSON.parse` throw (corrupt). On parse failure, back up the raw string under `<key>.corrupt` before returning `defaultValue`, and report through the same failure surface as §7.1 so a vanished timer/plan isn't silently indistinguishable from "nothing was ever saved."

### 7.3 Concurrent tabs clobber each other's writes

- **File**: `src/lib/stores/dough-plans.ts:21` (same pattern in `customizations.ts`, `calculator.ts`, `preferences.ts`)
- **Fix approach**: Add a `window.addEventListener('storage', …)` listener in the storage wrapper (or in each store) that rehydrates the affected store when another tab changes its key. For the array-backed stores (dough-plans, timers, customizations/history) prefer a re-read-merge-before-write in the mutator itself, so a save in tab A can't be blown away by a stale snapshot written from tab B.

### 7.4 getAvailableFlourTypes matches by id instead of flourType

- **File**: `src/lib/stores/calculator.ts:578`
- **Fix approach**: Build `usedIds` from `flour.flourType` (falling back to `flour.id` only when `flourType` is absent) so a recipe's base flour type is correctly excluded from the "add flour" dropdown. Fix the misleading fixture in `src/lib/utils/custom-flour.test.ts:161-164` (`id: 'semolina'` coincidentally equal to the flourType-option id) so the test actually exercises the id/flourType distinction instead of masking it.

### 7.5 No SvelteKit base path for GitHub Pages deployment

- **File**: `svelte.config.js:5`
- **Confidence gap to close first**: confirm the live URL is `jensen95.github.io/pizza-tool/` (project site) rather than a custom domain — there is no `CNAME` file anywhere in the repo, which supports the project-site path but should be checked against the actual GitHub Pages settings/deployed URL before merging.
- **Fix approach**: Set `kit.paths.base = process.env.BASE_PATH || ''` in `svelte.config.js`, wire `BASE_PATH=/pizza-tool` in `.github/workflows/deploy.yml`. Switch `static/manifest.json`'s `start_url`/icon `src` and `src/app.html`'s manifest/icon links to base-aware/relative forms, and switch in-app links (e.g. `RecipeCard.svelte`'s `<a href="/recipe/{recipe.id}">`) to use `$app/paths`'s `base` or SvelteKit's relative-link resolution.

### 7.6 Corrupted/missing localStorage silently drops active timers (cross-tab race)

- **File**: `src/lib/utils/timer-manager.ts:163`
- **Fix approach**: Covered by the storage-event listener / re-read-merge fix in §7.3 — `checkTimers()` should re-read before it writes back, not just before it reads for completion checks, so a concurrent pause/resume in another tab isn't overwritten by a stale snapshot. **Acceptance test**: pause a timer in tab A while tab B's `checkTimers` loop completes and writes a different timer in the same tick; tab A's pause must survive.

### 7.7 Foreground-only timer notifications

- **File**: `src/lib/utils/timer-manager.ts:182`
- **Fix approach**: Store the timer's absolute deadline (already available as `endTime`/equivalent) rather than relying purely on the running interval. On `visibilitychange`/`pageshow`, recompute elapsed time against that deadline and fire any notifications that were missed while backgrounded. True background push (via the already-dead `service-worker.js` push handler) is out of scope for a static PWA with no push server — document in-UI that "notifications fire when the app is open" so expectations are set correctly rather than promising background delivery.

### 7.8 Three `<select>` controls in DoughControls have no accessible name

- **File**: `src/lib/components/recipe/DoughControls.svelte:492, 530, 564`
- **Fix approach**: Add `<label for="...">` (visually-hidden if the layout doesn't have room) or `aria-label` to each of the three selects — add-flour, add-custom-flour-type, and yeast-type — so screen readers announce their purpose instead of just the current option value.

### 7.9 Phase 0.5 — Cheap hardening (approved)

Four split-verdict findings from `AUDIT.md`'s "Needs a second look" section are worth fixing regardless of the split verdict — each is cheap, low-risk, and either already-wrong-looking code or a straightforward a11y gap:

- **PwaPrompts `%sveltekit.assets%` literal** (`src/lib/components/ui/PwaPrompts.svelte:74`, finding A) — replace the literal string with `import { base, assets } from '$app/paths'`. Even though a refuter cast doubt on the exact failure mechanism (`getRegistration` argument semantics), the literal is unambiguously wrong code and should use the real base-path import regardless of whether update detection is fully broken or only partially degraded today.
- **No `aria-live` announcement for timer completion** (`src/lib/components/timer/TimerCard.svelte:58`, finding B) — add an `aria-live="polite"` (or `role="status"`) region that announces "Timer done" in-app alongside the existing system Notification, so the completion isn't visual-only for screen-reader users who don't have notifications granted.
- **Icon-only reset/undo buttons lack accessible names** (`src/lib/components/recipe/DoughControls.svelte:365` and its two siblings, finding H) — add `aria-label="Nulstil ..."` to each reset button; don't rely on the Unicode glyph or `title` attribute, which loses to text-content precedence in accessible-name computation.
- **Modal.svelte has no focus trap** (`src/lib/components/ui/Modal.svelte:43`, finding G) — either add focus-on-open plus Tab-cycling (a small, well-understood a11y fix), or delete the component since it currently has zero call sites anywhere in `src/`. Fixing it now is cheap insurance against the moment a feature (e.g. Dough Log's entry sheet, §5.4) adopts it without re-auditing.

The remaining split-verdict items are **tracked, not scheduled** — real concerns, but each has a refuter argument that keeps it out of approved Phase 0/0.5 scope for now:

- **Schema versioning in `storage.get`** (finding C) — no live bug today; the only precedent (`FLOUR_ID_MIGRATION`) patches one field for one key, so this is a future-proofing question, not a current defect.
- **Cap-50 truncation on dough-plans/history** (finding E) — a refuter called this a deliberate, documented design choice (named constant, explicit comment) defending against localStorage quota, not an accidental data-loss bug.
- **Unclamped `setIngredientPercentage`/`applyCustomIngredients`** (finding F) — the one live caller (`DoughControls.svelte handleExtraChange`) already guards range/`isNaN`; the store method is unguarded but currently unreachable out-of-range.
- **Live-reference getters in `customizations.ts`** (finding I) — `getForRecipe`/`applyToIngredients` hand out un-cloned internal state, but both have zero call sites in `src/` today; revisit if Dough Log or another feature starts calling them.
- **Ingredient-id uniqueness not enforced** (finding D) — a latent type-system gap (`IngredientBase.id` isn't scoped per mixing-step), but all 22 current recipe JSONs are collision-free and recipes are static, not user-authored.
