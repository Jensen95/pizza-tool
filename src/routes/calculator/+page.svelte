<script lang="ts">
	import { get } from 'svelte/store';
	import { recipes, calculator, totalWeight, ingredientsByStage } from '$lib/stores';
	import type { Recipe } from '$lib/types';

	let selectedRecipeId = $state<string | null>(null);
	let numberOfPizzas = $state(4);
	let doughBallWeight = $state(270);

	let selectedRecipe = $derived(
		selectedRecipeId
			? get(recipes).find((r) => r.id === selectedRecipeId) ?? null
			: null
	);

	$effect(() => {
		if (selectedRecipe) {
			calculator.setRecipe(selectedRecipe);
		}
	});

	$effect(() => {
		calculator.setNumberOfPizzas(numberOfPizzas);
	});

	$effect(() => {
		calculator.setDoughBallWeight(doughBallWeight);
	});

	function selectRecipe(recipe: Recipe) {
		selectedRecipeId = recipe.id;
		numberOfPizzas = recipe.yieldPizzas;
		doughBallWeight = recipe.baseWeight;
	}

	function formatWeight(weight: number): string {
		return weight >= 1000 ? `${(weight / 1000).toFixed(2)} kg` : `${Math.round(weight)} g`;
	}
</script>

<svelte:head>
	<title>Beregner - Pizza Tool</title>
</svelte:head>

<div class="calculator-page">
	<h1 class="page-title">Beregner</h1>

	<section class="recipe-selector">
		<h2 class="section-title">Vaelg opskrift</h2>
		<div class="recipe-grid">
			{#each $recipes as recipe}
				<button
					class="recipe-option"
					class:selected={selectedRecipeId === recipe.id}
					on:click={() => selectRecipe(recipe)}
				>
					<span class="recipe-name">{recipe.nameDa}</span>
					<span class="recipe-hydration">{recipe.hydration}%</span>
				</button>
			{/each}
		</div>
	</section>

	{#if selectedRecipe}
		<section class="inputs-section">
			<h2 class="section-title">Indstillinger</h2>
			<div class="input-grid">
				<div class="input-group">
					<label for="pizzas">Antal pizzaer</label>
					<input
						type="number"
						id="pizzas"
						bind:value={numberOfPizzas}
						min="1"
						max="50"
					/>
				</div>
				<div class="input-group">
					<label for="weight">Vaegt pr. pizza (g)</label>
					<input
						type="number"
						id="weight"
						bind:value={doughBallWeight}
						min="100"
						max="500"
						step="10"
					/>
				</div>
			</div>
			<div class="total-display">
				<span class="total-label">Total dej:</span>
				<span class="total-value">{formatWeight($totalWeight)}</span>
			</div>
		</section>

		<section class="results-section">
			<h2 class="section-title">Ingredienser</h2>

			{#each Object.entries($ingredientsByStage) as [stage, ingredients]}
				<div class="stage-group">
					{#if stage !== 'undefined'}
						<h3 class="stage-title">{stage}</h3>
					{/if}
					<table class="ingredients-table">
						<thead>
							<tr>
								<th>Ingrediens</th>
								<th class="numeric">%</th>
								<th class="numeric">Vaegt</th>
							</tr>
						</thead>
						<tbody>
							{#each ingredients as ing}
								<tr>
									<td>{ing.nameDa}</td>
									<td class="numeric">{ing.percentage.toFixed(1)}%</td>
									<td class="numeric weight">{formatWeight(ing.weight)}</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{/each}
		</section>
	{:else}
		<div class="empty-state">
			<p>Vaelg en opskrift ovenfor for at beregne ingredienser</p>
		</div>
	{/if}
</div>

<style>
	.calculator-page {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.page-title {
		margin: 0;
		font-size: var(--font-size-xl);
	}

	.section-title {
		margin: 0 0 var(--spacing-md);
		font-size: var(--font-size-lg);
	}

	.recipe-selector {
		background: var(--color-surface);
		padding: var(--spacing-md);
		border-radius: var(--radius-md);
	}

	.recipe-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
		gap: var(--spacing-sm);
	}

	.recipe-option {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--spacing-xs);
		padding: var(--spacing-sm);
		background: var(--color-background);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-md);
		cursor: pointer;
		transition: all 0.2s;
	}

	.recipe-option:hover {
		border-color: var(--color-primary);
	}

	.recipe-option.selected {
		border-color: var(--color-primary);
		background: rgba(211, 47, 47, 0.1);
	}

	.recipe-name {
		font-size: var(--font-size-sm);
		font-weight: 500;
		text-align: center;
	}

	.recipe-hydration {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.inputs-section {
		background: var(--color-surface);
		padding: var(--spacing-md);
		border-radius: var(--radius-md);
	}

	.input-grid {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--spacing-md);
		margin-bottom: var(--spacing-md);
	}

	.input-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.input-group label {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.input-group input {
		padding: var(--spacing-sm);
		font-size: var(--font-size-lg);
		border: 2px solid var(--color-border);
		border-radius: var(--radius-md);
		text-align: center;
	}

	.input-group input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.total-display {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-md);
		background: var(--color-primary);
		color: white;
		border-radius: var(--radius-md);
	}

	.total-label {
		font-weight: 500;
	}

	.total-value {
		font-size: var(--font-size-xl);
		font-weight: 700;
	}

	.results-section {
		background: var(--color-surface);
		padding: var(--spacing-md);
		border-radius: var(--radius-md);
	}

	.stage-group {
		margin-bottom: var(--spacing-md);
	}

	.stage-group:last-child {
		margin-bottom: 0;
	}

	.stage-title {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--font-size-md);
		color: var(--color-primary);
	}

	.ingredients-table {
		width: 100%;
		border-collapse: collapse;
	}

	.ingredients-table th,
	.ingredients-table td {
		padding: var(--spacing-sm);
		text-align: left;
		border-bottom: 1px solid var(--color-border);
	}

	.ingredients-table th {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		font-weight: 500;
	}

	.ingredients-table .numeric {
		text-align: right;
	}

	.ingredients-table .weight {
		font-weight: 600;
		color: var(--color-primary);
	}

	.empty-state {
		text-align: center;
		padding: var(--spacing-xl);
		color: var(--color-text-secondary);
	}
</style>
