<script lang="ts">
	import type { Recipe, YeastInfo } from '$lib/models';
	import { calculator, totalWeight, flourWeight, predoughRatio, recipeHistory } from '$lib/stores';
	import {
		formatWeight,
		getOriginalPredoughRatio as getRecipePredoughRatio,
		calculateHydration,
		getAllIngredients
	} from '$lib/utils/baker-percentage';
	import type { FlourTypeOption, FlourType } from '$lib/models';
	import { flourTypeLabels, yeastTypeLabels } from '$lib/models';
	import { yeastInfo } from '$lib/data/reference';
	import { getRecipeYeastType } from '$lib/utils/yeast';

	let { recipe }: { recipe: Recipe } = $props();

	let numberOfPizzas = $state($calculator.numberOfPizzas || 4);
	let doughBallWeight = $state($calculator.doughBallWeight || 270);

	const stageLabels: Record<string, string> = {
		poolish: 'Poolish',
		biga: 'Biga',
		preferment: 'Fordej',
		autolyse: 'Autolyse',
		bulk: 'Stuehavning',
		ball: 'Kugler',
		final: 'Final',
		hoveddej: 'Hoveddej',
		main: 'Hoveddej'
	};

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
		return calculateHydration(getAllIngredients(recipe));
	});
	let hydrationChanged = $derived(
		$calculator.hydration !== null && $calculator.hydration !== originalHydration
	);

	let hasYeast = $derived(getAllIngredients(recipe).some((ing) => ing.type === 'yeast'));
	let baseYeastType = $derived(getRecipeYeastType(recipe));
	let selectedYeastType = $derived($calculator.yeastType ?? baseYeastType);

	// Flour blends by stage
	let flourBlends = $derived.by(() => {
		// Read $calculator to subscribe to store changes
		void $calculator.scaledIngredients;
		const controls = calculator.getRecipeControls();
		return controls?.flours ?? [];
	});

	let customFloursByStage = $derived($calculator.customFlours || {});

	let flourStageTotals = $derived.by(() => {
		const totals: Record<string, number> = {};
		for (const blend of flourBlends) {
			totals[blend.mixingStepId] = blend.flours.reduce((sum, flour) => sum + flour.percentage, 0);
		}
		return totals;
	});

	let selectedFlourTypes = $state<Record<string, string>>({});
	let customFlourNames = $state<Record<string, string>>({});
	let customFlourTypes = $state<Record<string, FlourType['type']>>({});

	const customFlourOption = '__custom__';
	const fullGrainFlourIds = ['whole-wheat', 'rye', 'spelt'];

	let availableFlourTypesByStage = $derived.by(() => {
		// Read $calculator to subscribe to store changes
		void $calculator.scaledIngredients;
		const map: Record<string, FlourTypeOption[]> = {};
		for (const blend of flourBlends) {
			map[blend.mixingStepId] = calculator.getAvailableFlourTypes(blend.mixingStepId);
		}
		return map;
	});

	// Extra ingredients (salt, yeast, oil, sugar)
	let extras = $derived.by(() => {
		// Read $calculator to subscribe to store changes
		void $calculator.scaledIngredients;
		const controls = calculator.getRecipeControls();
		return controls?.extras ?? [];
	});

	// Has any customizations
	let hasCustomizations = $derived.by(() => {
		// Read $calculator to subscribe to store changes
		void $calculator.scaledIngredients;
		return calculator.hasCustomizations();
	});

	let hasRecipeChanges = $derived(hasCustomizations || doughBallWeight !== recipe.baseWeight);

	let fullGrainPercentage = $derived.by(() => {
		let total = 0;
		let fullGrain = 0;

		for (const blend of flourBlends) {
			const stageCustoms = customFloursByStage[blend.mixingStepId] || [];
			for (const flour of blend.flours) {
				const customMatch = stageCustoms.find((f) => f.flourId === flour.id);
				const flourTypeId = customMatch?.flourTypeId || flour.id;
				const flourType = customMatch?.flourType;
				const isFullGrain = fullGrainFlourIds.includes(flourTypeId) || flourType === 'whole-wheat';
				total += flour.percentage;
				if (isFullGrain) {
					fullGrain += flour.percentage;
				}
			}
		}

		if (total <= 0) return 0;
		return (fullGrain / total) * 100;
	});

	function slugifyName(value: string) {
		const slug = value
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
		return slug || 'custom';
	}

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

	function handleYeastTypeChange(type: YeastInfo['type']) {
		calculator.setYeastType(type);
	}

	// Flour blend handler
	function handleFlourBlendChange(stage: string, flourId: string, value: string) {
		const pct = parseFloat(value);
		const stageTotal = flourStageTotals[stage] ?? 0;
		if (isNaN(pct) || pct < 0 || stageTotal <= 0) return;
		const absolutePct = (pct / 100) * stageTotal;
		calculator.setFlourBlend(flourId, absolutePct);
	}

	function getStageFlourPercent(flour: { percentage: number }, stage: string) {
		const total = flourStageTotals[stage] || 1;
		return (flour.percentage / total) * 100;
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

	function handleAddFlour(stage: string) {
		const selected = selectedFlourTypes[stage];
		if (!selected) return;
		if (selected === customFlourOption) {
			const name = (customFlourNames[stage] || '').trim();
			if (!name) return;
			const flourTypeId = `custom-${slugifyName(name)}`;
			const flourType = customFlourTypes[stage] || 'other';
			calculator.addFlourType(stage, flourTypeId, 10, {
				customName: name,
				flourType
			});
			selectedFlourTypes = { ...selectedFlourTypes, [stage]: '' };
			customFlourNames = { ...customFlourNames, [stage]: '' };
			customFlourTypes = { ...customFlourTypes, [stage]: 'other' };
			return;
		}
		calculator.addFlourType(stage, selected, 10);
		selectedFlourTypes = { ...selectedFlourTypes, [stage]: '' };
	}

	function removeFlour(stage: string, flourId: string) {
		calculator.removeFlourType(stage, flourId);
	}

	function setSelectedFlourType(stage: string, value: string) {
		selectedFlourTypes = { ...selectedFlourTypes, [stage]: value };
		if (value !== customFlourOption) {
			customFlourNames = { ...customFlourNames, [stage]: '' };
			customFlourTypes = { ...customFlourTypes, [stage]: 'other' };
		}
	}

	function shouldShowCustomFlourFields(stage: string) {
		return selectedFlourTypes[stage] === customFlourOption;
	}

	function isAddFlourDisabled(stage: string) {
		const selected = selectedFlourTypes[stage];
		if (!selected) return true;
		if (selected === customFlourOption) {
			return !(customFlourNames[stage] || '').trim();
		}
		return false;
	}

	function isExtraCustomized(extra: {
		id: string;
		percentage: number;
		originalPercentage: number;
	}): boolean {
		return Math.abs(extra.percentage - extra.originalPercentage) > 0.01;
	}

	function saveCustomRecipe() {
		if (!hasRecipeChanges) return;

		const hydrationOverride = $calculator.hydration ?? null;
		const predoughOverride = $calculator.predoughRatio ?? null;

		recipeHistory.saveToHistory(
			recipe,
			calculator.getCustomIngredients(),
			numberOfPizzas,
			doughBallWeight,
			hydrationOverride,
			predoughOverride
		);
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
			<label class="label" for="ball-weight">Kuglevægt (g)</label>
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

	{#if flourBlends.length > 0 || extras.length > 0}
		<details class="controls-section advanced-section">
			<summary class="section-summary">Melblanding & ekstra</summary>
			<div class="details-body">
				{#if flourBlends.length > 0}
					<div class="controls-section">
						<h4 class="section-title">Melblanding</h4>
						{#each flourBlends as blend}
							<div class="flour-blend">
								<div class="flour-stage">
									<span class="stage-chip"
										>{stageLabels[blend.mixingStepId] || blend.mixingStepId}</span
									>
								</div>
								{#each blend.flours as flour}
									<div class="flour-blend-item">
										<div class="flour-header">
											<label class="label flour-label" for="flour-{flour.id}">
												{flour.nameDa}
											</label>
											<button
												class="btn-icon flour-remove"
												onclick={() => removeFlour(blend.mixingStepId, flour.id)}
												disabled={blend.flours.length <= 1}
												title="Fjern meltype"
											>
												&times;
											</button>
										</div>
										<div class="flour-input">
											<input
												id="flour-{flour.id}"
												type="number"
												class="input compact-input"
												value={getStageFlourPercent(flour, blend.mixingStepId).toFixed(1)}
												onchange={(e) =>
													handleFlourBlendChange(
														blend.mixingStepId,
														flour.id,
														(e.target as HTMLInputElement).value
													)}
												min="0"
												max="100"
												step="1"
											/>
											<span class="unit">%</span>
										</div>
									</div>
								{/each}
								<div class="flour-add">
									<select
										class="input select-input"
										id="add-flour-{blend.mixingStepId}"
										value={selectedFlourTypes[blend.mixingStepId] ?? ''}
										onchange={(e) =>
											setSelectedFlourType(
												blend.mixingStepId,
												(e.target as HTMLSelectElement).value
											)}
									>
										<option value="">Vælg meltype</option>
										{#each availableFlourTypesByStage[blend.mixingStepId] ?? [] as flourType}
											<option value={flourType.id}>{flourType.nameDa}</option>
										{/each}
										<option value={customFlourOption}>Anden meltype...</option>
									</select>
									<button
										class="btn btn-secondary add-flour-btn"
										onclick={() => handleAddFlour(blend.mixingStepId)}
										disabled={isAddFlourDisabled(blend.mixingStepId)}
										title="Tilføj meltype"
									>
										+
									</button>
								</div>
								{#if shouldShowCustomFlourFields(blend.mixingStepId)}
									<div class="custom-flour-fields">
										<input
											type="text"
											class="input"
											placeholder="Caputo Nuvola Super"
											value={customFlourNames[blend.mixingStepId] ?? ''}
											oninput={(e) =>
												(customFlourNames = {
													...customFlourNames,
													[blend.mixingStepId]: (e.target as HTMLInputElement).value
												})}
										/>
										<select
											class="input select-input"
											value={customFlourTypes[blend.mixingStepId] ?? 'other'}
											onchange={(e) =>
												(customFlourTypes = {
													...customFlourTypes,
													[blend.mixingStepId]: (e.target as HTMLSelectElement)
														.value as FlourType['type']
												})}
										>
											{#each Object.entries(flourTypeLabels) as [type, label]}
												<option value={type}>{label}</option>
											{/each}
										</select>
									</div>
								{/if}
							</div>
						{/each}
					</div>
					{#if fullGrainPercentage > 20}
						<div class="info-banner">
							<span class="banner-dot">i</span>
							<span
								>Din melblanding er {fullGrainPercentage.toFixed(1)}% fuldkorn. Over 20% kan give en
								tungere dej – justér efter smag.</span
							>
						</div>
					{/if}
				{/if}

				{#if hasYeast}
					<div class="controls-section">
						<h4 class="section-title">Gærtype</h4>
						<div class="yeast-row">
							<select
								class="input select-input"
								value={selectedYeastType}
								onchange={(e) =>
									handleYeastTypeChange((e.target as HTMLSelectElement).value as YeastInfo['type'])}
							>
								{#each yeastInfo as option}
									<option value={option.type}>{yeastTypeLabels[option.type]}</option>
								{/each}
							</select>
							<span class="yeast-hint">Konverterer mellem frisk og tør gær</span>
						</div>
					</div>
				{/if}

				{#if extras.length > 0}
					<div class="controls-section">
						<h4 class="section-title">Tilpas ingredienser</h4>
						<div class="extras-grid">
							{#each extras as extra}
								<div class="extra-item">
									<label class="label extra-label" for="extra-{extra.id}">
										{extra.nameDa}
										{#if isExtraCustomized(extra)}
											<button
												class="btn-reset"
												onclick={() => resetExtra(extra.id)}
												title="Nulstil"
											>
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
											onchange={(e) =>
												handleExtraChange(extra.id, (e.target as HTMLInputElement).value)}
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
			</div>
		</details>
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

	{#if hasRecipeChanges}
		<div class="customization-actions">
			<button class="btn btn-primary" onclick={saveCustomRecipe}>Gem til historik</button>
			{#if hasCustomizations}
				<button class="btn btn-secondary" onclick={resetAllCustomizations}>Nulstil alle</button>
			{/if}
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
		min-height: 44px;
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

	.advanced-section {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--spacing-sm);
		background: var(--color-background);
	}

	.section-summary {
		margin: 0;
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		font-weight: 600;
		cursor: pointer;
		list-style: none;
		padding: var(--spacing-xs) var(--spacing-sm);
		min-height: 44px;
		border-radius: var(--radius-sm);
		transition:
			background 0.15s ease,
			color 0.15s ease;
	}

	.section-summary::before {
		content: '▸';
		display: inline-block;
		margin-right: 6px;
		color: var(--color-text-secondary);
		transition: transform 0.2s ease;
	}

	details[open] .section-summary::before {
		transform: rotate(90deg);
	}

	.section-summary:hover {
		background: rgba(var(--color-primary-rgb), 0.08);
		color: var(--color-primary);
	}

	.section-summary::-webkit-details-marker {
		display: none;
	}

	.details-body {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		margin-top: var(--spacing-sm);
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
		flex-direction: column;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm) 0;
	}

	.flour-stage {
		display: flex;
		align-items: center;
	}

	.stage-chip {
		display: inline-flex;
		align-items: center;
		padding: 2px 8px;
		border-radius: 999px;
		background: var(--color-surface);
		color: var(--color-text-secondary);
		font-size: var(--font-size-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.flour-blend-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
		padding: 2px 0;
	}

	.flour-label {
		font-size: var(--font-size-sm);
		white-space: nowrap;
	}

	.flour-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-xs);
	}

	.flour-input {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
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

	.flour-add {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.custom-flour-fields {
		display: grid;
		grid-template-columns: 1fr minmax(140px, 200px);
		gap: var(--spacing-xs);
		margin-top: var(--spacing-xs);
	}

	@media (max-width: 500px) {
		.custom-flour-fields {
			grid-template-columns: 1fr;
		}
	}

	.select-input {
		min-width: 160px;
	}

	.add-flour-btn {
		min-width: 40px;
	}

	.yeast-row {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.yeast-hint {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.btn-icon {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0;
		min-width: 44px;
		min-height: 44px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		color: var(--color-text-secondary);
	}

	.btn-icon:disabled {
		cursor: not-allowed;
		opacity: 0.5;
	}

	.btn-icon:not(:disabled):hover {
		color: var(--color-primary);
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

	.info-banner {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		background: rgba(var(--color-primary-rgb), 0.08);
		border: 1px solid rgba(var(--color-primary-rgb), 0.15);
		border-radius: var(--radius-md);
		padding: var(--spacing-sm);
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.banner-dot {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		background: rgba(var(--color-primary-rgb), 0.16);
		color: var(--color-primary);
		font-weight: 700;
	}
</style>
