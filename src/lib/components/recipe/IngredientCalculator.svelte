<script lang="ts">
	import type { Recipe } from '$lib/types';
	import type { ScaledIngredient } from '$lib/types/ingredient';
	import { calculator, totalWeight, flourWeight, recipeHistory, predoughRatio } from '$lib/stores';
	import { formatWeight } from '$lib/utils/baker-percentage';

	let { recipe }: { recipe: Recipe } = $props();

	let editingIngredient = $state<string | null>(null);
	let editValue = $state('');

	// Use calculator store values, initialize from store
	let numberOfPizzas = $state($calculator.numberOfPizzas || 4);
	let doughBallWeight = $state($calculator.doughBallWeight || 270);

	// Get original predough ratio from recipe
	let originalPredoughRatio = $derived(calculator.getOriginalPredoughRatio());
	let hasPredough = $derived(originalPredoughRatio !== null);

	// Local state for main dough flour percentage (for slider)
	// This is the inverse: 100% - predough% = main%
	let mainDoughFlourPercent = $state<number>(100);

	// Set recipe in calculator when recipe changes
	$effect(() => {
		calculator.setRecipe(recipe);
	});

	// Keep local state in sync with calculator store
	$effect(() => {
		numberOfPizzas = $calculator.numberOfPizzas;
		doughBallWeight = $calculator.doughBallWeight;
	});

	// Initialize main dough flour percentage from recipe or store
	// Convert predough ratio to main dough percentage (100% - predough%)
	$effect(() => {
		const storeRatio = $predoughRatio;
		const origRatio = calculator.getOriginalPredoughRatio();
		if (storeRatio !== null) {
			mainDoughFlourPercent = Math.round((1 - storeRatio) * 100);
		} else if (origRatio !== null) {
			mainDoughFlourPercent = Math.round((1 - origRatio) * 100);
		}
	});

	function handlePizzaCountChange() {
		calculator.setNumberOfPizzas(numberOfPizzas);
	}

	function handleWeightChange() {
		calculator.setDoughBallWeight(doughBallWeight);
	}

	function handleMainDoughFlourChange() {
		// Convert main dough % to predough ratio (predough = 100% - main%)
		const predoughRatio = (100 - mainDoughFlourPercent) / 100;
		calculator.setPredoughRatio(predoughRatio);
	}

	function resetFlourSplit() {
		calculator.setPredoughRatio(null);
		const origRatio = calculator.getOriginalPredoughRatio();
		if (origRatio !== null) {
			mainDoughFlourPercent = Math.round((1 - origRatio) * 100);
		}
	}

	// Get original main dough flour percentage
	let originalMainDoughPercent = $derived(
		originalPredoughRatio !== null ? Math.round((1 - originalPredoughRatio) * 100) : 100
	);

	function groupIngredientsByStage(ingredients: ScaledIngredient[]) {
		const groups = new Map<string, ScaledIngredient[]>();

		for (const ing of ingredients) {
			const stage = ing.stage || 'hoveddej';
			const existing = groups.get(stage) || [];
			existing.push(ing);
			groups.set(stage, existing);
		}

		return groups;
	}

	let ingredientGroups = $derived(groupIngredientsByStage($calculator.scaledIngredients));
	let hasCustomizations = $derived(calculator.hasCustomizations());
	let hasFlourSplitChanged = $derived(
		$predoughRatio !== null &&
			originalPredoughRatio !== null &&
			mainDoughFlourPercent !== originalMainDoughPercent
	);

	const stageLabels: Record<string, string> = {
		poolish: 'Poolish',
		biga: 'Biga',
		preferment: 'Fordej',
		autolyse: 'Autolyse',
		bulk: 'Stuehævning',
		ball: 'Kugler',
		final: 'Final',
		hoveddej: 'Hoveddej',
		main: 'Hoveddej'
	};

	function decrementPizzas() {
		numberOfPizzas = Math.max(1, numberOfPizzas - 1);
		handlePizzaCountChange();
	}

	function incrementPizzas() {
		numberOfPizzas = Math.min(100, numberOfPizzas + 1);
		handlePizzaCountChange();
	}

	function decrementWeight() {
		doughBallWeight = Math.max(100, doughBallWeight - 5);
		handleWeightChange();
	}

	function incrementWeight() {
		doughBallWeight = Math.min(500, doughBallWeight + 5);
		handleWeightChange();
	}

	function startEditing(ingredientId: string, currentPercentage: number) {
		editingIngredient = ingredientId;
		editValue = currentPercentage.toFixed(2);
	}

	function cancelEditing() {
		editingIngredient = null;
		editValue = '';
	}

	/**
	 * Get all flour ingredients in the same stage as the given ingredient
	 */
	function getFlourIngredientsInStage(ingredientId: string): ScaledIngredient[] {
		const ingredient = $calculator.scaledIngredients.find((i) => i.id === ingredientId);
		if (!ingredient || ingredient.type !== 'flour') return [];

		const stage = ingredient.stage || 'main';
		return $calculator.scaledIngredients.filter(
			(i) => i.type === 'flour' && (i.stage || 'main') === stage
		);
	}

	/**
	 * Calculate the total original flour percentage for a stage
	 */
	function getOriginalFlourTotalForStage(stage: string): number {
		const originalFlours = recipe.ingredients.filter(
			(i) => i.type === 'flour' && (i.stage || 'main') === stage
		);
		return originalFlours.reduce((sum, i) => sum + i.percentage, 0);
	}

	/**
	 * Convert stage percentage to recipe percentage
	 */
	function stagePercentageToRecipePercentage(stagePercent: number, stage: string): number {
		const totalFlourInStage = getOriginalFlourTotalForStage(stage);
		return (stagePercent / 100) * totalFlourInStage;
	}

	function savePercentage(ingredientId: string) {
		const value = parseFloat(editValue);
		if (isNaN(value) || value < 0) {
			cancelEditing();
			return;
		}

		const ingredient = $calculator.scaledIngredients.find((i) => i.id === ingredientId);
		if (!ingredient) {
			cancelEditing();
			return;
		}

		// For flour ingredients, validate that total flour percentage remains constant
		if (ingredient.type === 'flour') {
			const floursInStage = getFlourIngredientsInStage(ingredientId);
			const stage = ingredient.stage || 'main';
			const originalTotal = getOriginalFlourTotalForStage(stage);

			// Convert the entered stage percentage to recipe percentage
			const recipePercentage = stagePercentageToRecipePercentage(value, stage);

			// Calculate what the new total would be
			const currentCustoms = calculator.getCustomIngredients();
			let newTotal = 0;
			for (const flour of floursInStage) {
				if (flour.id === ingredientId) {
					newTotal += recipePercentage;
				} else {
					// Use custom percentage if available, otherwise original
					const original = recipe.ingredients.find((i) => i.id === flour.id);
					newTotal += currentCustoms[flour.id] ?? original?.percentage ?? 0;
				}
			}

			// Allow some tolerance for rounding (0.01%)
			if (Math.abs(newTotal - originalTotal) > 0.01) {
				alert(
					`Total flour percentage for this stage must remain ${originalTotal.toFixed(2)}%. ` +
						`Your change would make it ${newTotal.toFixed(2)}%. ` +
						`Please adjust other flour types accordingly.`
				);
				cancelEditing();
				return;
			}

			// Save the recipe percentage, not the stage percentage
			calculator.setIngredientPercentage(ingredientId, recipePercentage);
		} else {
			// Non-flour ingredients: normal range check
			if (value > 200) {
				cancelEditing();
				return;
			}
			calculator.setIngredientPercentage(ingredientId, value);
		}

		cancelEditing();
	}

	function handleKeydown(event: KeyboardEvent, ingredientId: string) {
		if (event.key === 'Enter') {
			savePercentage(ingredientId);
		} else if (event.key === 'Escape') {
			cancelEditing();
		}
	}

	function resetIngredient(ingredientId: string) {
		calculator.resetIngredient(ingredientId);
	}

	function resetAllCustomizations() {
		calculator.resetAllCustomizations();
	}

	function saveToHistory() {
		const customIngredients = calculator.getCustomIngredients();
		recipeHistory.saveToHistory(recipe, customIngredients, numberOfPizzas, doughBallWeight);
	}

	function isCustomized(ingredientId: string): boolean {
		const customs = calculator.getCustomIngredients();
		return ingredientId in customs;
	}

	function getOriginalPercentage(ingredientId: string): number | undefined {
		const original = recipe.ingredients.find((i) => i.id === ingredientId);
		return original?.percentage;
	}
</script>

<div class="calculator">
	<div class="inputs">
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

	<div class="totals">
		<div class="total-item">
			<span class="total-label">Total dej:</span>
			<span class="total-value">{formatWeight($totalWeight)}</span>
		</div>
		<div class="total-item">
			<span class="total-label">Total mel:</span>
			<span class="total-value">{formatWeight($flourWeight)}</span>
		</div>
	</div>

	{#if hasCustomizations}
		<div class="customization-actions">
			<button class="btn btn-secondary" onclick={resetAllCustomizations}> Nulstil alle </button>
			<button class="btn btn-primary" onclick={saveToHistory}> Gem til historik </button>
		</div>
	{/if}

	<div class="ingredients">
		{#each ingredientGroups as [stage, ingredients]}
			<div class="ingredient-group">
				<h4 class="group-title">{stageLabels[stage] || stage}</h4>

				{#if hasPredough && (stage === 'main' || stage === 'hoveddej')}
					<div class="flour-split-control">
						<div class="flour-split-header">
							<span class="flour-split-label">Mel i hoveddej</span>
							{#if hasFlourSplitChanged}
								<button class="btn-link" onclick={resetFlourSplit}>Nulstil</button>
							{/if}
						</div>
						<div class="flour-split-slider">
							<input
								id="main-flour-percent"
								type="range"
								class="slider"
								bind:value={mainDoughFlourPercent}
								oninput={handleMainDoughFlourChange}
								min="0"
								max="100"
								step="1"
							/>
							<span class="flour-split-value">{mainDoughFlourPercent}%</span>
						</div>
						<p class="flour-split-hint">
							Fordej: {100 - mainDoughFlourPercent}% &middot; Hoveddej: {mainDoughFlourPercent}%
						</p>
					</div>
				{/if}

				<table class="ingredient-table">
					<thead>
						<tr>
							<th>Ingrediens</th>
							<th class="right">Procent</th>
							<th class="right">Vaegt</th>
						</tr>
					</thead>
					<tbody>
						{#each ingredients as ingredient}
							<tr class:customized={isCustomized(ingredient.id)}>
								<td>
									{ingredient.nameDa}
									{#if hasPredough && ingredient.type === 'flour'}
										<span class="flour-ratio-badge">
											{ingredient.percentage.toFixed(0)}% af total
										</span>
									{/if}
								</td>
								<td class="right percentage-cell">
									{#if editingIngredient === ingredient.id}
										<div class="edit-percentage">
											<input
												type="number"
												class="input percentage-input"
												bind:value={editValue}
												onkeydown={(e) => handleKeydown(e, ingredient.id)}
												step="0.1"
												min="0"
												max="200"
											/>
											<button
												class="btn-icon"
												onclick={() => savePercentage(ingredient.id)}
												title="Gem"
											>
												&#10003;
											</button>
											<button class="btn-icon" onclick={cancelEditing} title="Annuller">
												&#10005;
											</button>
										</div>
									{:else}
										<button
											class="percentage-button"
											onclick={() => startEditing(ingredient.id, ingredient.stagePercentage)}
											title="Klik for at redigere"
										>
											{ingredient.stagePercentage.toFixed(2)}%
											{#if isCustomized(ingredient.id)}
												<span class="original-percentage">
													(orig: {getOriginalPercentage(ingredient.id)?.toFixed(2)}%)
												</span>
											{/if}
										</button>
										{#if isCustomized(ingredient.id)}
											<button
												class="btn-icon reset-btn"
												onclick={() => resetIngredient(ingredient.id)}
												title="Nulstil"
											>
												&#8634;
											</button>
										{/if}
									{/if}
								</td>
								<td class="right weight">{formatWeight(ingredient.weight)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/each}
	</div>

	<p class="hint">
		Klik paa en procent for at tilpasse ingrediensen. For mel skal total procent forblive konstant.
	</p>
</div>

<style>
	.calculator {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.inputs {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--spacing-md);
	}

	@media (max-width: 400px) {
		.inputs {
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

	.flour-split-control {
		padding: var(--spacing-sm);
		margin-bottom: var(--spacing-sm);
		background: var(--color-surface);
		border-radius: var(--radius-sm);
		border-left: 3px solid var(--color-primary);
	}

	.flour-split-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--spacing-xs);
	}

	.flour-split-label {
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--color-text);
	}

	.flour-split-slider {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
	}

	.slider {
		flex: 1;
		height: 8px;
		border-radius: 4px;
		background: var(--color-border);
		appearance: none;
		cursor: pointer;
	}

	.slider::-webkit-slider-thumb {
		appearance: none;
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--color-primary);
		cursor: pointer;
	}

	.slider::-moz-range-thumb {
		width: 20px;
		height: 20px;
		border-radius: 50%;
		background: var(--color-primary);
		cursor: pointer;
		border: none;
	}

	.flour-split-value {
		font-weight: 600;
		color: var(--color-primary);
		min-width: 45px;
		text-align: right;
	}

	.flour-split-hint {
		margin: var(--spacing-xs) 0 0;
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.flour-ratio-badge {
		display: inline-block;
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		background: var(--color-surface);
		padding: 1px 6px;
		border-radius: var(--radius-sm);
		margin-left: var(--spacing-xs);
	}

	.btn-link {
		background: none;
		border: none;
		color: var(--color-primary);
		cursor: pointer;
		font-size: var(--font-size-sm);
		text-decoration: underline;
		padding: 0;
	}

	.btn-link:hover {
		color: var(--color-primary-dark, var(--color-primary));
	}

	.ingredients {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.ingredient-group {
		background: var(--color-background);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
	}

	.group-title {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--font-size-md);
		color: var(--color-primary);
	}

	.ingredient-table {
		width: 100%;
		border-collapse: collapse;
	}

	.ingredient-table th,
	.ingredient-table td {
		padding: var(--spacing-xs) var(--spacing-sm);
		text-align: left;
	}

	.ingredient-table th {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		font-weight: 500;
		border-bottom: 1px solid var(--color-border);
	}

	.ingredient-table td {
		border-bottom: 1px solid var(--color-border);
	}

	.ingredient-table tr:last-child td {
		border-bottom: none;
	}

	.right {
		text-align: right;
	}

	.weight {
		font-weight: 600;
		color: var(--color-primary);
	}

	.customization-actions {
		display: flex;
		gap: var(--spacing-sm);
		justify-content: flex-end;
	}

	.percentage-cell {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 4px;
	}

	.percentage-button {
		background: none;
		border: none;
		cursor: pointer;
		padding: 2px 6px;
		border-radius: var(--radius-sm);
		color: inherit;
		font-size: inherit;
		transition: background-color 0.2s;
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}

	.percentage-button:hover {
		background: var(--color-surface);
	}

	.original-percentage {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.edit-percentage {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.percentage-input {
		width: 60px;
		text-align: right;
		padding: 2px 4px;
		font-size: var(--font-size-sm);
	}

	.btn-icon {
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px;
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
		line-height: 1;
	}

	.btn-icon:hover {
		color: var(--color-primary);
	}

	.reset-btn {
		font-size: var(--font-size-lg);
	}

	tr.customized td {
		background: rgba(var(--color-primary-rgb), 0.1);
	}

	.hint {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		text-align: center;
		font-style: italic;
	}
</style>
