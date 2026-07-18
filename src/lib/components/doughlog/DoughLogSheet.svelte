<script lang="ts">
	// ABOUTME: Quick-log / manual-entry sheet for the Dough Log (§5.4). A slide-in
	// bottom sheet on --color-surface-elevated with Modal-style focus handling. It is
	// pre-fillable (the calculator can pass inferred ingredient/fermentation deviations)
	// and also works empty for a manual entry. On save it builds a NewDoughLogEntry and
	// hands it to `onsave`; if `onsave` reports failure (returns false) the sheet shows a
	// Danish inline error and stays open so the precious log isn't lost (§5.1).
	import { tick } from 'svelte';
	import type {
		NewDoughLogEntry,
		IngredientDeviation,
		FermentationDeviation
	} from '$lib/models/dough-log.types';

	let {
		open = false,
		recipeId = '',
		recipeName = '',
		recipeCategory = undefined,
		doughPlanId = undefined,
		numberOfPizzas = 0,
		doughBallWeight = 0,
		hydration = null,
		predoughRatio = null,
		initialIngredientDeviations = [],
		initialFermentationDeviations = [],
		title = 'Log en bagning',
		onsave,
		oncancel
	}: {
		open?: boolean;
		/** Recipe context snapshotted onto the entry. */
		recipeId?: string;
		recipeName?: string;
		recipeCategory?: string;
		doughPlanId?: string;
		numberOfPizzas?: number;
		doughBallWeight?: number;
		hydration?: number | null;
		predoughRatio?: number | null;
		/** Deviations the calculator inferred, pre-filled into the form (editable). */
		initialIngredientDeviations?: IngredientDeviation[];
		initialFermentationDeviations?: FermentationDeviation[];
		title?: string;
		/**
		 * Persist the built entry. Return `false` (or a Promise resolving to `false`) to
		 * signal the write failed — the sheet then shows an inline error and stays open.
		 * Wire this to `(entry) => doughLog.add(entry).persisted`.
		 */
		// eslint-disable-next-line no-unused-vars
		onsave?: (entry: NewDoughLogEntry) => boolean | void | Promise<boolean | void>;
		oncancel?: () => void;
	} = $props();

	type LocationValue = '' | 'room' | 'fridge' | 'warm';

	interface IngredientRow {
		ingredientId: string;
		label: string;
		kind: 'added' | 'omitted' | 'changed';
		plannedPct: number | null;
		actualPct: number | null;
	}

	interface FermentationRow {
		stepIndex: number;
		stepLabel: string;
		plannedMinutes: number | null;
		actualMinutes: number | null;
		plannedLocation: LocationValue;
		actualLocation: LocationValue;
		tempNote: string;
	}

	let ingredientRows = $state<IngredientRow[]>([]);
	let fermentationRows = $state<FermentationRow[]>([]);
	let notes = $state('');
	let rating = $state(0);
	let bakedAtDate = $state(todayISODate());
	let saveError = $state(false);
	let saving = $state(false);

	let sheetEl: HTMLDivElement | undefined = $state();
	let previouslyFocused: HTMLElement | null = null;
	let wasOpen = false;

	const locationLabels: Record<LocationValue, string> = {
		'': '—',
		room: 'Stuetemperatur',
		fridge: 'Køleskab',
		warm: 'Varmt'
	};

	function todayISODate(): string {
		return new Date().toISOString().slice(0, 10);
	}

	function resetForm() {
		ingredientRows = initialIngredientDeviations.map((d) => ({
			ingredientId: d.ingredientId,
			label: d.label,
			kind: d.kind,
			plannedPct: d.plannedPct ?? null,
			actualPct: d.actualPct ?? null
		}));
		fermentationRows = initialFermentationDeviations.map((d) => ({
			stepIndex: d.stepIndex,
			stepLabel: d.stepLabel,
			plannedMinutes: d.plannedMinutes ?? null,
			actualMinutes: d.actualMinutes ?? null,
			plannedLocation: (d.plannedLocation ?? '') as LocationValue,
			actualLocation: (d.actualLocation ?? '') as LocationValue,
			tempNote: d.tempNote ?? ''
		}));
		notes = '';
		rating = 0;
		bakedAtDate = todayISODate();
		saveError = false;
		saving = false;
	}

	// Reset + move focus into the sheet when it opens; restore focus on close (like Modal).
	$effect(() => {
		if (open && !wasOpen) {
			wasOpen = true;
			previouslyFocused = document.activeElement as HTMLElement | null;
			resetForm();
			tick().then(() => {
				const focusable = getFocusableElements();
				(focusable[0] ?? sheetEl)?.focus();
			});
		} else if (!open && wasOpen) {
			wasOpen = false;
			if (previouslyFocused) {
				previouslyFocused.focus();
				previouslyFocused = null;
			}
		}
	});

	const focusableSelector =
		'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

	function getFocusableElements(): HTMLElement[] {
		if (!sheetEl) return [];
		return Array.from(sheetEl.querySelectorAll<HTMLElement>(focusableSelector)).filter(
			(el) => el.offsetParent !== null
		);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (!open) return;
		if (e.key === 'Escape') {
			e.preventDefault();
			oncancel?.();
			return;
		}
		if (e.key === 'Tab') {
			const focusable = getFocusableElements();
			if (focusable.length === 0) {
				e.preventDefault();
				return;
			}
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			const active = document.activeElement;
			const isInside = active instanceof Node && sheetEl?.contains(active);
			if (e.shiftKey) {
				if (active === first || !isInside) {
					e.preventDefault();
					last.focus();
				}
			} else if (active === last || !isInside) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	function handleBackdropClick(e: MouseEvent) {
		if (e.target === e.currentTarget) oncancel?.();
	}

	function addIngredientRow() {
		ingredientRows = [
			...ingredientRows,
			{ ingredientId: '', label: '', kind: 'changed', plannedPct: null, actualPct: null }
		];
	}

	function removeIngredientRow(index: number) {
		ingredientRows = ingredientRows.filter((_, i) => i !== index);
	}

	function addFermentationRow() {
		fermentationRows = [
			...fermentationRows,
			{
				stepIndex: fermentationRows.length,
				stepLabel: '',
				plannedMinutes: null,
				actualMinutes: null,
				plannedLocation: '',
				actualLocation: '',
				tempNote: ''
			}
		];
	}

	function removeFermentationRow(index: number) {
		fermentationRows = fermentationRows.filter((_, i) => i !== index);
	}

	function setRating(value: number) {
		// Tapping the current rating again clears it.
		rating = rating === value ? 0 : value;
	}

	function handleStarKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
			e.preventDefault();
			rating = Math.min(5, rating + 1);
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
			e.preventDefault();
			rating = Math.max(0, rating - 1);
		} else {
			return;
		}
		// Move DOM focus to follow selection (WAI-ARIA radiogroup pattern), so AT
		// announces the newly-checked star. Buttons stay focusable regardless of the
		// roving tabindex, and currentTarget is still valid synchronously here.
		const target = rating || 1;
		const stars = (e.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>('.star-btn');
		stars[target - 1]?.focus();
	}

	function slug(s: string): string {
		return s
			.toLowerCase()
			.trim()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	function buildEntry(): NewDoughLogEntry {
		const ingredientDeviations: IngredientDeviation[] = ingredientRows
			.filter((r) => r.label.trim() !== '')
			.map((r, i) => ({
				ingredientId: r.ingredientId || slug(r.label) || `ingrediens-${i}`,
				label: r.label.trim(),
				kind: r.kind,
				plannedPct: r.plannedPct,
				actualPct: r.actualPct
			}));

		const fermentationDeviations: FermentationDeviation[] = fermentationRows
			.filter(
				(r) =>
					r.stepLabel.trim() !== '' ||
					r.plannedMinutes != null ||
					r.actualMinutes != null ||
					r.tempNote.trim() !== '' ||
					r.plannedLocation !== '' ||
					r.actualLocation !== ''
			)
			.map((r, i) => ({
				stepIndex: r.stepIndex ?? i,
				stepLabel: r.stepLabel.trim(),
				plannedMinutes: r.plannedMinutes,
				actualMinutes: r.actualMinutes,
				plannedLocation: r.plannedLocation === '' ? null : r.plannedLocation,
				actualLocation: r.actualLocation === '' ? null : r.actualLocation,
				tempNote: r.tempNote.trim() || undefined
			}));

		const bakedAt = bakedAtDate
			? new Date(`${bakedAtDate}T12:00:00`).toISOString()
			: new Date().toISOString();

		return {
			recipeId,
			recipeName,
			recipeCategory,
			doughPlanId,
			numberOfPizzas,
			doughBallWeight,
			hydration,
			predoughRatio,
			ingredientDeviations,
			fermentationDeviations,
			notes: notes.trim() || undefined,
			outcome: rating >= 1 ? (rating as 1 | 2 | 3 | 4 | 5) : undefined,
			bakedAt
		};
	}

	async function handleSave() {
		if (saving) return;
		saving = true;
		saveError = false;
		try {
			const result = await onsave?.(buildEntry());
			if (result === false) {
				saveError = true;
			}
		} finally {
			saving = false;
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="sheet-backdrop" onclick={handleBackdropClick}>
		<div
			class="sheet"
			role="dialog"
			aria-modal="true"
			aria-labelledby="dough-log-sheet-title"
			tabindex="-1"
			bind:this={sheetEl}
		>
			<div class="sheet-header">
				<h2 id="dough-log-sheet-title" class="sheet-title">{title}</h2>
				<button type="button" class="close-btn" onclick={() => oncancel?.()} aria-label="Luk">
					<svg
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M18 6L6 18M6 6l12 12" />
					</svg>
				</button>
			</div>

			<div class="sheet-body">
				{#if recipeName}
					<p class="recipe-context">{recipeName}</p>
				{/if}

				<div class="field">
					<label class="label" for="dough-log-baked-at">Bagedato</label>
					<input
						id="dough-log-baked-at"
						class="input"
						type="date"
						bind:value={bakedAtDate}
						max={todayISODate()}
					/>
				</div>

				<!-- Ingredient deviations -->
				<fieldset class="group">
					<legend class="group-legend">Ingrediens-afvigelser</legend>
					{#each ingredientRows as row, i (i)}
						<div class="row ingredient-row">
							<input
								class="input row-label"
								type="text"
								placeholder="Ingrediens"
								bind:value={row.label}
								aria-label={`Ingrediens ${i + 1}`}
							/>
							<select
								class="input row-kind"
								bind:value={row.kind}
								aria-label={`Type for ingrediens ${i + 1}`}
							>
								<option value="changed">Ændret</option>
								<option value="added">Tilføjet</option>
								<option value="omitted">Udeladt</option>
							</select>
							{#if row.kind !== 'added'}
								<input
									class="input row-pct"
									type="number"
									step="0.1"
									inputmode="decimal"
									placeholder="Plan %"
									bind:value={row.plannedPct}
									aria-label={`Planlagt procent for ingrediens ${i + 1}`}
								/>
							{/if}
							{#if row.kind !== 'omitted'}
								<input
									class="input row-pct"
									type="number"
									step="0.1"
									inputmode="decimal"
									placeholder="Faktisk %"
									bind:value={row.actualPct}
									aria-label={`Faktisk procent for ingrediens ${i + 1}`}
								/>
							{/if}
							<button
								type="button"
								class="row-remove"
								onclick={() => removeIngredientRow(i)}
								aria-label={`Fjern ingrediens ${i + 1}`}
							>
								✕
							</button>
						</div>
					{/each}
					<button type="button" class="btn btn-secondary add-row" onclick={addIngredientRow}>
						+ Tilføj ingrediens
					</button>
				</fieldset>

				<!-- Fermentation deviations -->
				<fieldset class="group">
					<legend class="group-legend">Gærings-afvigelser</legend>
					{#each fermentationRows as row, i (i)}
						<div class="ferment-row">
							<div class="row">
								<input
									class="input row-label"
									type="text"
									placeholder="Trin (fx koldhævning)"
									bind:value={row.stepLabel}
									aria-label={`Gæringstrin ${i + 1}`}
								/>
								<button
									type="button"
									class="row-remove"
									onclick={() => removeFermentationRow(i)}
									aria-label={`Fjern gæringstrin ${i + 1}`}
								>
									✕
								</button>
							</div>
							<div class="row">
								<input
									class="input"
									type="number"
									inputmode="numeric"
									placeholder="Plan min."
									bind:value={row.plannedMinutes}
									aria-label={`Planlagte minutter for trin ${i + 1}`}
								/>
								<input
									class="input"
									type="number"
									inputmode="numeric"
									placeholder="Faktisk min."
									bind:value={row.actualMinutes}
									aria-label={`Faktiske minutter for trin ${i + 1}`}
								/>
							</div>
							<div class="row">
								<select
									class="input"
									bind:value={row.plannedLocation}
									aria-label={`Planlagt placering for trin ${i + 1}`}
								>
									{#each Object.entries(locationLabels) as [value, lbl] (value)}
										<option {value}>{value === '' ? 'Plan: —' : `Plan: ${lbl}`}</option>
									{/each}
								</select>
								<select
									class="input"
									bind:value={row.actualLocation}
									aria-label={`Faktisk placering for trin ${i + 1}`}
								>
									{#each Object.entries(locationLabels) as [value, lbl] (value)}
										<option {value}>{value === '' ? 'Faktisk: —' : `Faktisk: ${lbl}`}</option>
									{/each}
								</select>
							</div>
							<input
								class="input"
								type="text"
								placeholder="Temperatur-note (fx køkkenet var 26°C)"
								bind:value={row.tempNote}
								aria-label={`Temperatur-note for trin ${i + 1}`}
							/>
						</div>
					{/each}
					<button type="button" class="btn btn-secondary add-row" onclick={addFermentationRow}>
						+ Tilføj gæringstrin
					</button>
				</fieldset>

				<!-- Notes -->
				<div class="field">
					<label class="label" for="dough-log-notes">Noter</label>
					<textarea
						id="dough-log-notes"
						class="input notes"
						rows="3"
						placeholder="Hvordan gik det?"
						bind:value={notes}></textarea>
				</div>

				<!-- Rating -->
				<div class="field">
					<span class="label" id="dough-log-rating-label">Bedømmelse</span>
					<!-- svelte-ignore a11y_no_redundant_roles -->
					<div
						class="stars"
						role="radiogroup"
						tabindex="-1"
						aria-labelledby="dough-log-rating-label"
						onkeydown={handleStarKeydown}
					>
						{#each [1, 2, 3, 4, 5] as star (star)}
							<button
								type="button"
								class="star-btn"
								class:filled={star <= rating}
								role="radio"
								aria-checked={star === rating}
								aria-label={`${star} ud af 5 stjerner`}
								tabindex={star === (rating || 1) ? 0 : -1}
								onclick={() => setRating(star)}
							>
								<span aria-hidden="true">★</span>
							</button>
						{/each}
						{#if rating > 0}
							<button
								type="button"
								class="clear-rating"
								onclick={() => (rating = 0)}
								aria-label="Ryd bedømmelse"
							>
								Ryd
							</button>
						{/if}
					</div>
				</div>

				{#if saveError}
					<p class="save-error" role="alert" aria-live="assertive">
						Bagningen kunne ikke gemmes på enheden. Prøv igen — luk ikke sheetet.
					</p>
				{/if}
			</div>

			<div class="sheet-footer">
				<button type="button" class="btn btn-secondary" onclick={() => oncancel?.()}>
					Annuller
				</button>
				<button type="button" class="btn btn-primary" onclick={handleSave} disabled={saving}>
					{saving ? 'Gemmer…' : 'Gem bagning'}
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.sheet-backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: flex-end;
		justify-content: center;
		z-index: 200;
	}

	@media (min-width: 600px) {
		.sheet-backdrop {
			align-items: center;
			padding: var(--spacing-md);
		}
	}

	.sheet {
		background: var(--color-surface-elevated);
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
		box-shadow: var(--shadow-lg);
		width: 100%;
		max-width: 560px;
		max-height: 92vh;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	@media (min-width: 600px) {
		.sheet {
			border-radius: var(--radius-lg);
			max-height: 88vh;
		}
	}

	@media (prefers-reduced-motion: no-preference) {
		.sheet {
			animation: sheetIn 0.24s ease-out;
		}
	}

	@keyframes sheetIn {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	.sheet-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		border-bottom: 1px solid var(--color-border);
		flex-shrink: 0;
	}

	.sheet-title {
		margin: 0;
		font-size: var(--font-size-lg);
		color: var(--color-text);
	}

	.close-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		min-width: 44px;
		min-height: 44px;
		color: var(--color-text-secondary);
		border: none;
		background: none;
		border-radius: var(--radius-full);
		cursor: pointer;
	}

	.close-btn:hover {
		background: var(--color-border);
		color: var(--color-text);
	}

	.sheet-body {
		padding: var(--spacing-md);
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.recipe-context {
		margin: 0;
		font-weight: 600;
		color: var(--color-text);
	}

	.field {
		display: flex;
		flex-direction: column;
	}

	.group {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--spacing-sm) var(--spacing-md) var(--spacing-md);
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.group-legend {
		font-weight: 600;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		padding: 0 var(--spacing-xs);
	}

	.row {
		display: flex;
		gap: var(--spacing-sm);
		align-items: center;
	}

	.ferment-row {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	.row-label {
		flex: 1;
		min-width: 0;
	}

	.row-kind {
		flex-shrink: 0;
		width: auto;
	}

	.row-pct {
		width: 5.5rem;
		flex-shrink: 0;
	}

	.row-remove {
		flex-shrink: 0;
		width: 44px;
		height: 44px;
		min-width: 44px;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		border-radius: var(--radius-sm);
		color: var(--color-text-secondary);
		font-size: 1.125rem;
		line-height: 1;
		cursor: pointer;
	}

	.row-remove:hover {
		background: var(--color-border);
		color: var(--color-error);
	}

	.add-row {
		align-self: flex-start;
	}

	.notes {
		resize: vertical;
		min-height: 66px;
		font-family: inherit;
	}

	.stars {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.star-btn {
		width: 44px;
		height: 44px;
		min-width: 44px;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		background: none;
		border: none;
		border-radius: var(--radius-sm);
		font-size: 1.5rem;
		line-height: 1;
		color: var(--color-border);
		cursor: pointer;
		transition: color 0.15s;
	}

	.star-btn.filled {
		color: var(--color-accent);
	}

	.star-btn:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.clear-rating {
		margin-left: var(--spacing-sm);
		min-height: 44px;
		padding: 0 var(--spacing-sm);
		background: none;
		border: none;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		cursor: pointer;
		border-radius: var(--radius-sm);
	}

	.clear-rating:hover {
		color: var(--color-text);
		background: var(--color-border);
	}

	.save-error {
		margin: 0;
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-warning-bg);
		border: 1px solid var(--color-warning-border);
		border-radius: var(--radius-md);
		color: var(--color-text);
		font-size: var(--font-size-sm);
	}

	.sheet-footer {
		display: flex;
		gap: var(--spacing-sm);
		justify-content: flex-end;
		padding: var(--spacing-md);
		border-top: 1px solid var(--color-border);
		flex-shrink: 0;
	}
</style>
