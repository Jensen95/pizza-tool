<script lang="ts">
	import type { Recipe } from '$lib/types';
	import { calculator, totalWeight, flourWeight, predoughRatio } from '$lib/stores';
	import {
		formatWeight,
		getOriginalPredoughRatio as getRecipePredoughRatio,
		calculateHydration
	} from '$lib/utils/baker-percentage';

	let { recipe }: { recipe: Recipe } = $props();

	let numberOfPizzas = $state($calculator.numberOfPizzas || 4);
	let doughBallWeight = $state($calculator.doughBallWeight || 270);

	// Keep local state in sync with calculator store
	$effect(() => {
		numberOfPizzas = $calculator.numberOfPizzas;
		doughBallWeight = $calculator.doughBallWeight;
	});

	// Predough info
	let originalPredoughRatio = $derived(getRecipePredoughRatio(recipe));
	let hasPredough = $derived(originalPredoughRatio !== null);
	let originalPredoughPercent = $derived(
		originalPredoughRatio !== null ? Math.round(originalPredoughRatio * 100) : 0
	);
	let currentPredoughPercent = $derived.by(() => {
		if ($predoughRatio !== null) return Math.round($predoughRatio * 100);
		return originalPredoughPercent;
	});
	let predoughChanged = $derived(
		$predoughRatio !== null &&
			originalPredoughRatio !== null &&
			currentPredoughPercent !== originalPredoughPercent
	);

	// Hydration info
	let originalHydration = $derived(recipe.hydration);
	let effectiveHydration = $derived.by(() => {
		if ($calculator.hydration !== null) return $calculator.hydration;
		return calculateHydration(recipe.ingredients);
	});
	let hydrationChanged = $derived(
		$calculator.hydration !== null && $calculator.hydration !== originalHydration
	);

	// Flour blends: stages with 2+ flour types
	let flourBlends = $derived.by(() => {
		const controls = calculator.getRecipeControls();
		return controls?.flours ?? [];
	});

	// Extra ingredients (salt, yeast, oil, sugar)
	let extras = $derived.by(() => {
		const controls = calculator.getRecipeControls();
		return controls?.extras ?? [];
	});

	// Has any customizations
	let hasCustomizations = $derived(calculator.hasCustomizations());

	// Pizza count handlers
	function decrementPizzas() {
		numberOfPizzas = Math.max(1, numberOfPizzas - 1);
		calculator.setNumberOfPizzas(numberOfPizzas);
	}
	function incrementPizzas() {
		numberOfPizzas = Math.min(100, numberOfPizzas + 1);
		calculator.setNumberOfPizzas(numberOfPizzas);
	}
	function handlePizzaCountChange() {
		calculator.setNumberOfPizzas(numberOfPizzas);
	}

	// Weight handlers
	function decrementWeight() {
		doughBallWeight = Math.max(100, doughBallWeight - 5);
		calculator.setDoughBallWeight(doughBallWeight);
	}
	function incrementWeight() {
		doughBallWeight = Math.min(500, doughBallWeight + 5);
		calculator.setDoughBallWeight(doughBallWeight);
	}
	function handleWeightChange() {
		calculator.setDoughBallWeight(doughBallWeight);
	}

	// Hydration handlers
	function decrementHydration() {
		const newVal = Math.max(40, effectiveHydration - 1);
		calculator.setHydration(newVal);
	}
	function incrementHydration() {
		const newVal = Math.min(100, effectiveHydration + 1);
		calculator.setHydration(newVal);
	}
	function resetHydration() {
		calculator.resetHydration();
	}

	// Predough split handlers
	function decrementPredough() {
		const newVal = Math.max(0, currentPredoughPercent - 1);
		calculator.setPredoughRatio(newVal / 100);
	}
	function incrementPredough() {
		const newVal = Math.min(100, currentPredoughPercent + 1);
		calculator.setPredoughRatio(newVal / 100);
	}
	function resetPredough() {
		calculator.setPredoughRatio(null);
	}

	// Flour blend handler
	function handleFlourBlendChange(flourId: string, value: string) {
		const pct = parseFloat(value);
		if (isNaN(pct) || pct < 0) return;
		calculator.setFlourBlend(flourId, pct);
	}

	// Extra ingredient handler
	function handleExtraChange(ingredientId: string, value: string) {
		const pct = parseFloat(value);
		if (isNaN(pct) || pct < 0 || pct > 200) return;
		calculator.setIngredientPercentage(ingredientId, pct);
	}

	function resetExtra(ingredientId: string) {
		calculator.resetIngredient(ingredientId);
	}

	function isExtraCustomized(extra: {
		id: string;
		percentage: number;
		originalPercentage: number;
	}): boolean {
		return Math.abs(extra.percentage - extra.originalPercentage) > 0.01;
	}

	// Reset all
	function resetAllCustomizations() {
		calculator.resetAllCustomizations();
	}
</script>

<div class="controls">
	<!-- Row 1: Pizza count + Ball weight -->
	<div class="controls-row">
		<div class="input-group">
			<label class="label" for="pizza-count">Antal pizzaer</label>
			<div class="input-with-buttons">
				<button class="btn btn-secondary" onclick={decrementPizzas} disabled={numberOfPizzas <= 1}
					>-</button
				>
				<input
					id="pizza-count"
					type="number"
					class="input number-input"
					bind:value={numberOfPizzas}
					onchange={handlePizzaCountChange}
					min="1"
					max="100"
				/>
				<button class="btn btn-secondary" onclick={incrementPizzas} disabled={numberOfPizzas >= 100}
					>+</button
				>
			</div>
		</div>

		<div class="input-group">
			<label class="label" for="ball-weight">Kuglevaegt (g)</label>
			<div class="input-with-buttons">
				<button
					class="btn btn-secondary"
					onclick={decrementWeight}
					disabled={doughBallWeight <= 100}>-5</button
				>
				<input
					id="ball-weight"
					type="number"
					class="input number-input"
					bind:value={doughBallWeight}
					onchange={handleWeightChange}
					min="100"
					max="500"
					step="5"
				/>
				<button
					class="btn btn-secondary"
					onclick={incrementWeight}
					disabled={doughBallWeight >= 500}>+5</button
				>
			</div>
		</div>
	</div>

	<!-- Row 2: Hydration + Predough split -->
	<div class="controls-row">
		<div class="input-group">
			<label class="label" for="hydration">
				Hydrering (%)
				{#if hydrationChanged}
					<button class="btn-reset" onclick={resetHydration} title="Nulstil hydrering">
						&#8634;
					</button>
				{/if}
			</label>
			<div class="input-with-buttons">
				<button
					class="btn btn-secondary"
					onclick={decrementHydration}
					disabled={effectiveHydration <= 40}>-</button
				>
				<input
					id="hydration"
					type="number"
					class="input number-input"
					class:customized={hydrationChanged}
					value={effectiveHydration}
					onchange={(e) => {
						const val = parseInt((e.target as HTMLInputElement).value);
						if (!isNaN(val)) calculator.setHydration(val);
					}}
					min="40"
					max="100"
				/>
				<button
					class="btn btn-secondary"
					onclick={incrementHydration}
					disabled={effectiveHydration >= 100}>+</button
				>
			</div>
			{#if hydrationChanged}
				<span class="original-hint">orig: {originalHydration}%</span>
			{/if}
		</div>

		{#if hasPredough}
			<div class="input-group">
				<label class="label" for="predough-split">
					Fordej (%)
					{#if predoughChanged}
						<button class="btn-reset" onclick={resetPredough} title="Nulstil fordeling">
							&#8634;
						</button>
					{/if}
				</label>
				<div class="input-with-buttons">
					<button
						class="btn btn-secondary"
						onclick={decrementPredough}
						disabled={currentPredoughPercent <= 0}>-</button
					>
					<input
						id="predough-split"
						type="number"
						class="input number-input"
						class:customized={predoughChanged}
						value={currentPredoughPercent}
						onchange={(e) => {
							const val = parseInt((e.target as HTMLInputElement).value);
							if (!isNaN(val)) calculator.setPredoughRatio(Math.max(0, Math.min(100, val)) / 100);
						}}
						min="0"
						max="100"
					/>
					<button
						class="btn btn-secondary"
						onclick={incrementPredough}
						disabled={currentPredoughPercent >= 100}>+</button
					>
				</div>
				{#if predoughChanged}
					<span class="original-hint">orig: {originalPredoughPercent}%</span>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Row 3: Flour blends (only for stages with 2+ flour types) -->
	{#if flourBlends.length > 0}
		<div class="controls-section">
			<h4 class="section-title">Melblanding</h4>
			{#each flourBlends as blend}
				<div class="flour-blend">
					{#each blend.flours as flour}
						<div class="flour-blend-item">
							<label class="label flour-label" for="flour-{flour.id}">{flour.nameDa}</label>
							<input
								id="flour-{flour.id}"
								type="number"
								class="input compact-input"
								value={flour.percentage.toFixed(1)}
								onchange={(e) =>
									handleFlourBlendChange(flour.id, (e.target as HTMLInputElement).value)}
								min="0"
								max="100"
								step="1"
							/>
							<span class="unit">%</span>
						</div>
					{/each}
				</div>
			{/each}
		</div>
	{/if}

	<!-- Row 4: Extra ingredients (salt, yeast, oil, sugar) -->
	{#if extras.length > 0}
		<div class="controls-section">
			<h4 class="section-title">Tilpas ingredienser</h4>
			<div class="extras-grid">
				{#each extras as extra}
					<div class="extra-item">
						<label class="label extra-label" for="extra-{extra.id}">
							{extra.nameDa}
							{#if isExtraCustomized(extra)}
								<button class="btn-reset" onclick={() => resetExtra(extra.id)} title="Nulstil">
									&#8634;
								</button>
							{/if}
						</label>
						<div class="extra-input-row">
							<input
								id="extra-{extra.id}"
								type="number"
								class="input compact-input"
								class:customized={isExtraCustomized(extra)}
								value={extra.percentage.toFixed(2)}
								onchange={(e) => handleExtraChange(extra.id, (e.target as HTMLInputElement).value)}
								min="0"
								max="200"
								step="0.1"
							/>
							<span class="unit">%</span>
						</div>
						{#if isExtraCustomized(extra)}
							<span class="original-hint">orig: {extra.originalPercentage.toFixed(2)}%</span>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Totals bar -->
	<div class="totals">
		<div class="total-item">
			<span class="total-label">Total dej:</span>
			<span class="total-value">{formatWeight($totalWeight)}</span>
		</div>
		<div class="total-item">
			<span class="total-label">Total mel:</span>
			<span class="total-value">{formatWeight($flourWeight)}</span>
		</div>
		<div class="total-item">
			<span class="total-label">Hydrering:</span>
			<span class="total-value">{effectiveHydration}%</span>
		</div>
	</div>

	{#if hasCustomizations}
		<div class="customization-actions">
			<button class="btn btn-secondary" onclick={resetAllCustomizations}>Nulstil alle</button>
		</div>
	{/if}
</div>

<style>
	.controls {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.controls-row {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--spacing-md);
	}

	@media (max-width: 400px) {
		.controls-row {
			grid-template-columns: 1fr;
		}
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.input-with-buttons {
		display: flex;
		gap: 4px;
	}

	.input-with-buttons .btn {
		padding: var(--spacing-sm);
		min-width: 44px;
	}

	.number-input {
		flex: 1;
		text-align: center;
		font-weight: 600;
	}

	.number-input.customized {
		background: rgba(var(--color-primary-rgb), 0.1);
	}

	.controls-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.section-title {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.flour-blend {
		display: flex;
		gap: var(--spacing-md);
		flex-wrap: wrap;
	}

	.flour-blend-item {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.flour-label {
		font-size: var(--font-size-sm);
		white-space: nowrap;
	}

	.compact-input {
		width: 70px;
		text-align: right;
		padding: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-sm);
	}

	.compact-input.customized {
		background: rgba(var(--color-primary-rgb), 0.1);
	}

	.unit {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.extras-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: var(--spacing-sm);
	}

	.extra-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.extra-label {
		font-size: var(--font-size-sm);
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.extra-input-row {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.original-hint {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.btn-reset {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0 2px;
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
		line-height: 1;
	}

	.btn-reset:hover {
		color: var(--color-primary);
	}

	.totals {
		display: flex;
		justify-content: space-around;
		padding: var(--spacing-md);
		background: var(--color-background);
		border-radius: var(--radius-md);
	}

	.total-item {
		text-align: center;
	}

	.total-label {
		display: block;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.total-value {
		display: block;
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--color-primary);
	}

	.customization-actions {
		display: flex;
		gap: var(--spacing-sm);
		justify-content: flex-end;
	}
</style>
