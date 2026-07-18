# Production Audit

This audit covers the pizza-tool codebase across six dimensions — persistence, in-memory state, app lifecycle, boot/navigation, accessibility, and public API/store contracts — spanning `src/lib/utils/storage.ts`, the persisted Svelte stores (`dough-plans.ts`, `customizations.ts`, `calculator.ts`, `timer-manager.ts`), the SvelteKit deployment configuration, and the recipe/timer/modal UI components. Every finding below was independently cross-checked by separate verifier agents before being included; verdicts are marked **CONFIRMED** (auditor plus both verifiers agreed) or **PLAUSIBLE** (verifiers split). 1 candidate finding was refuted outright during verification and dropped entirely from this report.

## Findings

### 1. storage.set() failures are swallowed everywhere; UI commits the change while the write silently no-ops

- **File**: `src/lib/utils/storage.ts:37`
- **Layer**: state
- **Severity**: critical
- **Confidence**: high
- **Verdict**: CONFIRMED (2/2 votes)
- **Failure**: Every persisting store (dough-plans, preferences, customizations, recipeHistory, timers, calculator) calls `storage.set()` but never checks its boolean return value. `storage.set()` catches ALL exceptions (QuotaExceededError on iOS Safari private browsing where localStorage quota is 0, or a full quota after months of history/plans) and just returns `false`. Meanwhile every caller already committed the new value to the in-memory writable via `update()`/`set()` before or independent of the storage write succeeding (e.g. `dough-plans.ts` `update()` sets the store's in-memory state unconditionally, then `save()` is called and its result ignored). So the user sees their dough plan/customization/timer saved in the UI, but nothing hit disk. On the next reload, app restart, or OS-driven tab restore, all of that work is gone with zero error shown anywhere.
- **Evidence**:
  ```
  function set<T>(key: string, value: T): boolean {
    try {
      window.localStorage.setItem(...)
      return true;
    } catch {
      return false;
    }
  }
  ```

### 2. Any corrupted/partial localStorage value is silently treated as "never saved" — active timers can vanish without a trace

- **File**: `src/lib/utils/storage.ts:25`
- **Layer**: state
- **Severity**: high
- **Confidence**: medium
- **Verdict**: CONFIRMED (2/2 votes)
- **Failure**: `get<T>()` wraps `JSON.parse` in a catch-all that returns the caller's default value on ANY error — a truncated write (e.g. app killed mid-`setItem`, or a previous QuotaExceededError left a half-written value from a different code path), a corrupting browser extension, or simply a hand-edited/legacy value all look identical to "key was never set". `timer-manager.ts`'s `getTimers()` (used by the timers store's `init()`) relies on exactly this: any corruption in the `'timers'` key silently returns `[]` and every active/paused fermentation timer the user was relying on for an overnight cold-ferment disappears with no error, no banner, and no way to recover it — the countdown and eventual notification simply never happen.
- **Evidence**:
  ```
  try {
    const item = window.localStorage.getItem(STORAGE_PREFIX + key);
    if (item === null) return defaultValue;
    return JSON.parse(item) as T;
  } catch {
    return defaultValue;
  }
  ```

### 3. Every persisted store loads localStorage once into memory and writes back only from that stale snapshot — concurrent tabs clobber each other silently

- **File**: `src/lib/stores/dough-plans.ts:21`
- **Layer**: state
- **Severity**: high
- **Confidence**: high
- **Verdict**: CONFIRMED (2/2 votes)
- **Failure**: `loadPlans()` is called exactly once when the module-level store is created (line 21). Every mutation (`savePlan`/`deletePlan`/`clearPlans`) computes its next value purely from this store's own prior in-memory state, then overwrites the entire localStorage key with that computed array — it never re-reads storage first and there is no `storage` event listener anywhere in the store files to pick up changes from other tabs. Same pattern repeats identically in `customizations.ts`, `calculator.ts` (`customIngredientsStore`/`customFloursStore`/`hydrationOverridesStore`/`yeastTypeOverridesStore`) and `preferences.ts`. On a phone, opening the recipe detail page in two tabs (or a tab restored by the OS after being backgrounded, plus a fresh tab) and saving a dough plan or ingredient customization in each will cause the second write to fully overwrite the first tab's addition — last write wins, first tab's data vanishes with no warning.
- **Evidence**:
  ```
  function loadPlans(): SavedDoughPlan[] {
    return storage.get<SavedDoughPlan[]>(DOUGH_PLANS_KEY, []);
  }
  function createDoughPlansStore() {
    const { subscribe, update, set } = writable<SavedDoughPlan[]>(loadPlans());
  ```

### 4. getAvailableFlourTypes matches base flour by ingredient id instead of flourType, so a recipe's original flour type is never excluded from the "add flour" list

- **File**: `src/lib/stores/calculator.ts:578`
- **Layer**: state
- **Severity**: medium
- **Confidence**: high
- **Verdict**: CONFIRMED (2/2 votes)
- **Failure**: Real recipe JSON gives flour ingredients ids like `flour`, `biga-flour`, `main-flour` while the flour *type* (matching `flourTypeOptions[].id`, e.g. `tipo-00`, `bread`, `semolina`) lives in the separate `flourType` field (confirmed in `src/lib/data/recipes/bk-biga-v1.json:16-18`: `"id": "biga-flour" ... "flourType": "tipo-00"`). `getAvailableFlourTypes` builds `usedIds` from `flour.id` (line 578) instead of `flour.flourType`, so for every real recipe the base flour's actual type is never in `usedIds` and is never filtered out of the dropdown. A user can therefore "add" the same flour type the stage already has, and `addFlourType` happily creates a second, differently-keyed flour ingredient (`custom-flour-<stage>-tipo-00`) alongside the original, which `persistStageFlours` writes to `customFloursStore`/localStorage permanently — a stage now shows the identical flour type twice with split percentages. The existing unit test at `src/lib/utils/custom-flour.test.ts:345-351` only passes because its fixture contrives `id: 'semolina'` to equal the flourType-option id `semolina`, masking the id/flourType mix-up.
- **Evidence**:
  ```
  calculator.ts:574-580: const baseStageFlours = getAllIngredients(currentRecipe).filter(...); for (const flour of baseStageFlours) { usedIds.add(flour.id); } return flourTypeOptions.filter((type) => !usedIds.has(type.id));
  custom-flour.test.ts:161-164: { id: 'semolina', percentage: 100, type: 'flour', flourType: 'tipo-00' }
  bk-biga-v1.json:16-18: "id": "biga-flour", ... "flourType": "tipo-00"
  ```

### 5. Cross-tab race: checkTimers() can clobber a concurrently-written pause/resume with stale data

- **File**: `src/lib/utils/timer-manager.ts:163`
- **Layer**: state
- **Severity**: medium
- **Confidence**: low — Would need an actual two-tab/two-window integration test (or instrumented localStorage writes with induced timing) to confirm the write ordering and reproduce a lost pause/resume in practice.
- **Verdict**: CONFIRMED (2/2 votes)
- **Failure**: Each tab runs its own 1s `checkTimers` loop that calls `getTimers()` (a fresh localStorage read) into a local `timers` array, and only calls `saveTimers(timers)` if it found a newly-completed timer in that snapshot. If Tab B reads its snapshot, then Tab A pauses a timer (writing `pausedAt`/`remainingWhenPaused` to localStorage) in the small window before Tab B's loop iteration finishes and calls `saveTimers(timers)` (because some other timer completed in Tab B's snapshot), Tab B's write overwrites the whole timers array with its stale copy, silently reverting Tab A's pause. This requires two tabs/windows open simultaneously and a millisecond-level race, so it's a real but narrow multi-tab data-loss scenario rather than a certainty.
- **Evidence**:
  ```
  export async function checkTimers(): Promise<Timer[]> {
  	const timers = getTimers();
  	let updated = false;
  	for (const timer of timers) { ... }
  	if (updated) { saveTimers(timers); }
  	return timers;
  }
  ```

### 6. No SvelteKit base path configured for a GitHub Pages project-site deployment, while routes/manifest hardcode root-absolute paths

- **File**: `svelte.config.js:5`
- **Layer**: navigation
- **Severity**: critical
- **Confidence**: medium — Check the repository's GitHub Pages settings (Settings > Pages > Custom domain) or fetch the live deployed URL to confirm whether the site is actually served from the domain root (custom domain) or from `/pizza-tool/`; if the latter, this is a confirmed critical break, not a risk.
- **Verdict**: CONFIRMED (2/2 votes)
- **Failure**: The repo (Jensen95/pizza-tool) deploys via `.github/workflows/deploy.yml` using `actions/deploy-pages` with no CNAME file in `static/`, which is the standard setup for a GitHub Pages *project* site served at `https://jensen95.github.io/pizza-tool/` (not at the domain root). `svelte.config.js` sets no `kit.paths.base`, so every hardcoded root-absolute reference — `static/manifest.json`'s `start_url: "/"` and icon `src` paths, `src/app.html`'s `<link rel="manifest" href="/manifest.json">` and apple-touch-icon, and in-app links like `RecipeCard.svelte`'s `<a href="/recipe/{recipe.id}">` and Navigation/Header links — resolve against the domain root instead of the `/pizza-tool/` subpath. A cold start from the real production URL (or from a home-screen icon launched via manifest `start_url`) loads an HTML shell whose own asset/manifest references point outside the actually-deployed path, and every recipe-card/nav link navigates users off the app to a 404 outside the SvelteKit fallback that `build/404.html` only covers for paths still under `/pizza-tool/`. This would make the shipped PWA effectively non-functional at its real URL, not just a nit. Verification confirmed no CNAME file exists anywhere in the repo (only `.nojekyll`, icons, `manifest.json`, `robots.txt`, `service-worker.js` in `static/`), which contradicts rather than supports the custom-domain escape hatch.
- **Evidence**:
  ```
  kit: {
    adapter: adapter({ pages: 'build', assets: 'build', fallback: 'index.html', ... }),
    prerender: { handleHttpError: 'warn', handleMissingId: 'warn' }
  }
  // no `paths: { base }` anywhere in the file
  ```

### 7. Timer-completion notifications only fire from a foreground setInterval loop; no push subscription exists, so backgrounded/locked devices never get the alert

- **File**: `src/lib/utils/timer-manager.ts:182`
- **Layer**: native/platform
- **Severity**: high
- **Confidence**: high
- **Verdict**: CONFIRMED (2/2 votes)
- **Failure**: `checkTimers()`/`sendNotification` are only invoked from the `setInterval(..., 1000)` started by `startTimerManager`, which itself only runs while the app's JS is executing. On real devices, backgrounding the PWA, locking the screen, or the OS suspending the tab (common on iOS Safari/home-screen PWAs and Android after a short background period) halts JS timers entirely — no interval ticks, so `checkTimers` never runs and no notification is sent while the dough finishes proofing. `static/service-worker.js` does implement a `push` event handler (lines 119-136) that could deliver a notification while the JS is suspended, but nothing in the codebase ever calls `pushManager.subscribe(...)` or posts a subscription to a server (grep across `src/` for `pushManager`/`subscribe`/`PushSubscription` returns no app-side usage) — the push handler is dead code. The user only learns the timer finished once they reopen the app in the foreground and the interval catches up, which for a proofing/baking timer defeats the purpose of a background alert.
- **Evidence**:
  ```
  const intervalId = setInterval(async () => {
  	const timers = await checkTimers();
  	onUpdate(timers);
  }, 1000);
  [service-worker.js] self.addEventListener('push', (event) => { ... event.waitUntil(self.registration.showNotification(...)) });
  ```

### 8. Three `<select>` controls in DoughControls have no accessible name

- **File**: `src/lib/components/recipe/DoughControls.svelte:492`
- **Layer**: a11y
- **Severity**: high
- **Confidence**: high
- **Verdict**: CONFIRMED (2/2 votes)
- **Failure**: Screen-reader user opens the "Melblanding & ekstra" advanced section to add a flour type, add a custom flour type, or change yeast type; all three `<select>` elements (lines 492, 530, 564) have no `<label for>`, `aria-label`, or `aria-labelledby` (confirmed via grep of the whole file), so the control announces only its current option value with no indication of purpose.
- **Evidence**:
  ```
  <select class="input select-input" id="add-flour-{blend.mixingStepId}" ...>
  	<option value="">Vælg meltype</option>
  ```

## Needs a second look (split verdicts)

### A. PwaPrompts.svelte re-registers the service worker with a literal, un-substituted `%sveltekit.assets%` string, permanently breaking update detection

- **File**: `src/lib/components/ui/PwaPrompts.svelte:74`
- **Layer**: native/platform
- **Severity**: critical
- **Confidence**: high
- **Verdict**: PLAUSIBLE (1/2 votes)
- **Failure**: SvelteKit only performs the `%sveltekit.assets%` template substitution when processing `src/app.html` at build/render time. `PwaPrompts.svelte` copies that exact snippet into a `.svelte` component's `<script>`, where it is just a JS string literal — it is never substituted and stays the literal text `'%sveltekit.assets%'`. So `serviceWorkerScope` becomes the garbage string `'%sveltekit.assets%'` instead of `'/'`. `getRegistration('%sveltekit.assets%')` then finds nothing, so the code falls through to `register(serviceWorkerPath, {scope: serviceWorkerScope})` with an invalid path/scope, which throws and is swallowed by the catch block — `registration` is left `null`, so `watchForUpdates` never runs and `showUpdateBanner` never becomes true. A refuter countered that `getRegistration(clientURL)` takes a document/client URL (not a scope) and resolves it relative to the page base URL, casting doubt on the exact failure mechanism described.
- **Evidence**:
  ```
  const assetBase = '%sveltekit.assets%'.replace(/\/$/, '');
  const serviceWorkerPath = `${assetBase || ''}/service-worker.js`;
  const serviceWorkerScope = assetBase || '/';
  registration =
  	existing ||
  	(await navigator.serviceWorker.register(serviceWorkerPath, { scope: serviceWorkerScope }));
  ```

### B. Timer completion/status changes are never announced (no aria-live)

- **File**: `src/lib/components/timer/TimerCard.svelte:58`
- **Layer**: a11y
- **Severity**: critical
- **Confidence**: high
- **Verdict**: PLAUSIBLE (1/2 votes)
- **Failure**: Blind user starts a fermentation/bake timer and puts the device down; when `timer.status` flips from active to completed, only a visual badge/color change occurs with zero `aria-live`/`role=status` anywhere in the timer components (verified via repo-wide grep), so the user gets no non-visual signal that the dough/step is ready. A refuter noted this is mitigated in practice by the system Notification fired via `timers.ts` → `startTimerManager` → `sendNotification`, which does not depend on the DOM badge.
- **Evidence**:
  ```
  {#if isCompleted}
  	<span class="status-badge completed">Færdig!</span>
  {:else if isPaused}
  ```

### C. No schema versioning anywhere in storage.get — shape changes silently produce malformed objects instead of triggering a migration

- **File**: `src/lib/utils/storage.ts:22`
- **Layer**: state
- **Severity**: high
- **Confidence**: medium
- **Verdict**: PLAUSIBLE (1/2 votes)
- **Failure**: `get<T>()` blindly JSON.parses and casts to `T` with no version field, no shape check. The only migration path in the whole codebase is the ad-hoc `FLOUR_ID_MIGRATION` dictionary in `calculator.ts` (lines 79-102) that patches one renamed field for one key — proof this has already bitten the team once, with no general mechanism to prevent it recurring for `SavedDoughPlan`, `RecipeCustomization`, `RecipeHistoryEntry`, `Timer`, or `Preferences`. A refuter pointed out this describes a hypothetical future-schema-change risk rather than a live bug, and that `loadPreferences()` already defends against missing keys via a spread-default pattern.
- **Evidence**:
  ```
  export function get<T>(key: string, defaultValue: T): T {
    ...
    return JSON.parse(item) as T;
  }
  const FLOUR_ID_MIGRATION: Record<string, string> = {
    'bread-flour': 'bread',
    semola: 'semolina'
  };
  ```

### D. Ingredient id uniqueness across a recipe's mixing steps is assumed by consumers but not enforced by the type system

- **File**: `src/lib/models/recipe.types.ts:17`
- **Layer**: public API
- **Severity**: high
- **Confidence**: medium — Verified no current recipe JSON has duplicate ingredient ids within a recipe (checked all 22 files programmatically), so this is a latent contract gap, not a live bug — would need a lint/schema check or a runtime assertion to be certain it can never be introduced by a future recipe author or generator.
- **Verdict**: PLAUSIBLE (1/2 votes)
- **Failure**: `IngredientBase.id` is just `string` — nothing ties it to the parent Recipe or enforces cross-`MixingStep` uniqueness. But `customizations.ts:140` (`customization.ingredients[ing.id]`) and `RecipeCustomization.ingredients` (a flat `Record<string, number>`) key by that bare id across the *entire* flattened recipe. If a future recipe JSON reuses an id like `'flour'` in two mixing steps, a customization intended for one stage's flour silently overwrites/applies to the other stage's ingredient with the same id, with no type error and no runtime warning. A refuter confirmed all 22 current recipe JSONs are collision-free and recipe data is static, not user-authored, so no live code path exercises this today.
- **Evidence**:
  ```
  interface IngredientBase {
  	id: string;
  	percentage: number;
  	notes?: string;
  }
  ... ingredients: Record<string, number>; // ingredientId -> custom percentage
  ```

### E. Saved dough plans and recipe history are silently truncated past their cap with no archival or warning

- **File**: `src/lib/stores/dough-plans.ts:45`
- **Layer**: state
- **Severity**: medium
- **Confidence**: high
- **Verdict**: PLAUSIBLE (1/2 votes)
- **Failure**: `savePlan()` unconditionally slices to `MAX_PLANS=50` (`[entry, ...state].slice(0, MAX_PLANS)`) and persists the truncated array, permanently deleting the oldest saved plan the instant a 51st is added — same pattern in `customizations.ts`'s `recipeHistory.saveToHistory` (`.slice(0, 50)`, line 194). A user who has been logging dough experiments for months will have their oldest recorded recipe iterations silently deleted with no toast, export prompt, or way to know it happened. A refuter argued the cap is a deliberate, documented design choice (named constant, explicit comment) and a defense against localStorage's ~5MB quota, not an accidental defect.
- **Evidence**:
  ```
  update((state) => {
    const newState = [entry, ...state].slice(0, MAX_PLANS);
    save(newState);
    return newState;
  });
  ```

### F. setIngredientPercentage/applyCustomIngredients persist arbitrary percentages with no clamping, unlike every sibling setter

- **File**: `src/lib/stores/calculator.ts:678`
- **Layer**: state
- **Severity**: medium
- **Confidence**: medium — Would need to confirm whether any other current or planned caller invokes setIngredientPercentage/applyCustomIngredients without the DoughControls-level guard, and whether recipeHistory entries can realistically contain out-of-range values today.
- **Verdict**: PLAUSIBLE (1/2 votes)
- **Failure**: `setHydration` clamps to 40-100, `setNumberOfPizzas` clamps to 1-100, `setDoughBallWeight` clamps to 100-500 — but `setIngredientPercentage` writes whatever `percentage` it's given straight into `customIngredientsStore`, and `applyCustomIngredients` does the same for an entire `Record<string, number>` sourced from `recipeHistory` entries, with no shape/range validation at all. Today the only caller (`DoughControls.svelte handleExtraChange`) happens to guard `isNaN`/`0-200`, but the store method itself is a public API with no defense-in-depth. A refuter traced every write path and found the guard is present at the only live call site today, and the history-replay path is a closed loop that cannot currently introduce out-of-range values.
- **Evidence**:
  ```
  calculator.ts:678-693: setIngredientPercentage(ingredientId: string, percentage: number) { if (!currentRecipe) return; customIngredientsStore.update((state) => { ... [ingredientId]: percentage ... saveCustomIngredients(newState);
  calculator.ts:799-810: applyCustomIngredients(ingredients: Record<string, number>) { ... [recipeId]: { ...ingredients } ... saveCustomIngredients(newState);
  ```

### G. Modal.svelte lacks a focus trap / initial focus management

- **File**: `src/lib/components/ui/Modal.svelte:43`
- **Layer**: a11y
- **Severity**: medium
- **Confidence**: high
- **Verdict**: PLAUSIBLE (1/2 votes)
- **Failure**: Component has `role=dialog`, `aria-modal=true`, and Escape-to-close, but never calls `.focus()` on open and has no Tab-cycling logic, so keyboard focus can wander into obscured background content and AT may never announce the dialog since focus never enters it. A refuter confirmed the component is currently unused anywhere in the app (zero import/usage hits across `src`), so this is dead code today — not a live production issue, but a critical blocker the moment any feature adopts it.
- **Evidence**:
  ```
  <div class="modal-backdrop" onclick={handleBackdropClick}>
  	<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
  ```

### H. Icon-only reset/undo buttons may have no meaningful accessible name

- **File**: `src/lib/components/recipe/DoughControls.svelte:365`
- **Layer**: a11y
- **Severity**: medium
- **Confidence**: low — Would need to actually test this glyph in VoiceOver/NVDA (e.g. via the agent-browser skill) to confirm whether it reads as silent/unhelpful before treating this as high confidence.
- **Verdict**: PLAUSIBLE (1/2 votes)
- **Failure**: Reset buttons for hydration/predough/extra customizations use only a lone Unicode arrow glyph as their text content (which takes precedence over the `title` attribute for accessible-name computation) and no `aria-label`; if the AT does not verbalize the glyph, a screen-reader user has no way to discover the "reset to original" action next to each customized field. A refuter argued the auditor's own reasoning about `title` precedence undercuts the conclusion of total silence.
- **Evidence**:
  ```
  <button class="btn-reset" onclick={resetHydration} title="Nulstil hydrering">
  	&#8634;
  </button>
  ```

### I. customizations.getForRecipe() and applyToIngredients() hand out live references into the store's internal state, not copies

- **File**: `src/lib/stores/customizations.ts:56`
- **Layer**: state
- **Severity**: medium
- **Confidence**: low — Currently no call site in src/routes or src/lib/components calls customizations.getForRecipe (only recipeHistory.getForRecipe is used); would need to see the actual dough-log feature code to confirm it does an in-place mutation rather than a copy-then-set.
- **Verdict**: PLAUSIBLE (1/2 votes)
- **Failure**: `getForRecipe(recipeId)` returns `get({subscribe})[recipeId]` directly — the actual object living inside the writable store's internal record, not a clone. Any new feature that calls this and then mutates the returned object in place will corrupt the store's internal state without ever calling `update()`/`save()`: Svelte subscribers won't be notified, and localStorage will silently diverge from the in-memory value. A refuter confirmed both cited methods currently have zero call sites anywhere in `src/` — they are dead code with respect to consumers today.
- **Evidence**:
  ```
  getForRecipe(recipeId: string): RecipeCustomization | undefined {
  	return get({ subscribe })[recipeId];
  }
  ```

## Solid areas

- **Public API / store method contracts (api)** — genuinely solid: the two concerns raised here (ingredient-id uniqueness assumptions in `recipe.types.ts`, and unclamped setters in `calculator.ts`) both remained split-verdict on independent review and neither survived as a confirmed, live production defect.
