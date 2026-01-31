<script lang="ts">
	import { onMount } from 'svelte';
	import type { Recipe } from '$lib/types';
	import { calculator, totalWeight, flourWeight } from '$lib/stores';
	import { formatWeight } from '$lib/utils/baker-percentage';

	export let recipe: Recipe;

	let numberOfPizzas = recipe.yieldPizzas;
	let doughBallWeight = recipe.baseWeight;

	onMount(() => {
		calculator.setRecipe(recipe);
	});

	function handlePizzaCountChange() {
		calculator.setNumberOfPizzas(numberOfPizzas);
	}

	function handleWeightChange() {
		calculator.setDoughBallWeight(doughBallWeight);
	}

	$: ingredientGroups = groupIngredientsByStage($calculator.scaledIngredients);

	function groupIngredientsByStage(ingredients: typeof $calculator.scaledIngredients) {
		const groups = new Map<string, typeof ingredients>();

		for (const ing of ingredients) {
			const stage = ing.stage || 'hoveddej';
			const existing = groups.get(stage) || [];
			existing.push(ing);
			groups.set(stage, existing);
		}

		return groups;
	}

	const stageLabels: Record<string, string> = {
		poolish: 'Poolish',
		biga: 'Biga',
		preferment: 'Fordej',
		autolyse: 'Autolyse',
		bulk: 'Stuehaevning',
		ball: 'Kugler',
		final: 'Final',
		hoveddej: 'Hoveddej',
		main: 'Hoveddej'
	};
</script>

<div class="calculator">
	<div class="inputs">
		<div class="input-group">
			<label class="label" for="pizza-count">Antal pizzaer</label>
			<div class="input-with-buttons">
				<button
					class="btn btn-secondary"
					on:click={() => { numberOfPizzas = Math.max(1, numberOfPizzas - 1); handlePizzaCountChange(); }}
					disabled={numberOfPizzas <= 1}
				>-</button>
				<input
					id="pizza-count"
					type="number"
					class="input number-input"
					bind:value={numberOfPizzas}
					on:change={handlePizzaCountChange}
					min="1"
					max="100"
				/>
				<button
					class="btn btn-secondary"
					on:click={() => { numberOfPizzas = Math.min(100, numberOfPizzas + 1); handlePizzaCountChange(); }}
					disabled={numberOfPizzas >= 100}
				>+</button>
			</div>
		</div>

		<div class="input-group">
			<label class="label" for="ball-weight">Kuglevaegt (g)</label>
			<div class="input-with-buttons">
				<button
					class="btn btn-secondary"
					on:click={() => { doughBallWeight = Math.max(100, doughBallWeight - 10); handleWeightChange(); }}
					disabled={doughBallWeight <= 100}
				>-10</button>
				<input
					id="ball-weight"
					type="number"
					class="input number-input"
					bind:value={doughBallWeight}
					on:change={handleWeightChange}
					min="100"
					max="500"
					step="10"
				/>
				<button
					class="btn btn-secondary"
					on:click={() => { doughBallWeight = Math.min(500, doughBallWeight + 10); handleWeightChange(); }}
					disabled={doughBallWeight >= 500}
				>+10</button>
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

	<div class="ingredients">
		{#each ingredientGroups as [stage, ingredients]}
			<div class="ingredient-group">
				<h4 class="group-title">{stageLabels[stage] || stage}</h4>
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
							<tr>
								<td>{ingredient.nameDa}</td>
								<td class="right">{ingredient.percentage.toFixed(1)}%</td>
								<td class="right weight">{formatWeight(ingredient.weight)}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		{/each}
	</div>
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
</style>
