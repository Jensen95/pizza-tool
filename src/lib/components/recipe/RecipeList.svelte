<script lang="ts">
	import { get } from 'svelte/store';
	import type { Recipe, RecipeCategory } from '$lib/types';
	import { recipes, calculator } from '$lib/stores';
	import RecipeCard from './RecipeCard.svelte';
	import { categoryLabels } from '$lib/types';

	let searchQuery = $state('');
	let selectedCategory = $state<RecipeCategory | 'all'>('all');

	let numberOfPizzas = $state($calculator.numberOfPizzas || 4);
	let doughBallWeight = $state($calculator.doughBallWeight || 270);

	function handlePizzaCountChange() {
		calculator.setNumberOfPizzas(numberOfPizzas);
	}

	function handleWeightChange() {
		calculator.setDoughBallWeight(doughBallWeight);
	}

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

	function getFilteredRecipes(
		query: string,
		category: RecipeCategory | 'all',
		allRecipes: Recipe[]
	): Recipe[] {
		let result = allRecipes;

		if (query.trim()) {
			const lowerQuery = query.toLowerCase();
			result = result.filter(
				(r) =>
					r.name.toLowerCase().includes(lowerQuery) || r.nameDa.toLowerCase().includes(lowerQuery)
			);
		}

		if (category !== 'all') {
			result = result.filter((r) => r.category === category);
		}

		return result;
	}

	let allRecipes = $derived(get(recipes));
	let filteredRecipes = $derived(getFilteredRecipes(searchQuery, selectedCategory, allRecipes));
	let categories = $derived(Array.from(new Set(allRecipes.map((r) => r.category))));

	function resetFilters() {
		searchQuery = '';
		selectedCategory = 'all';
	}
</script>

<div class="recipe-list">
	<div class="pizza-settings">
		<div class="setting-group">
			<label class="setting-label" for="main-pizza-count">Antal pizzaer</label>
			<div class="setting-controls">
				<button class="btn btn-sm" onclick={decrementPizzas} disabled={numberOfPizzas <= 1}
					>-</button
				>
				<input
					id="main-pizza-count"
					type="number"
					class="input number-input"
					bind:value={numberOfPizzas}
					onchange={handlePizzaCountChange}
					min="1"
					max="100"
				/>
				<button class="btn btn-sm" onclick={incrementPizzas} disabled={numberOfPizzas >= 100}
					>+</button
				>
			</div>
		</div>

		<div class="setting-group">
			<label class="setting-label" for="main-ball-weight">Kuglevaegt (g)</label>
			<div class="setting-controls">
				<button class="btn btn-sm" onclick={decrementWeight} disabled={doughBallWeight <= 100}
					>-5</button
				>
				<input
					id="main-ball-weight"
					type="number"
					class="input number-input"
					bind:value={doughBallWeight}
					onchange={handleWeightChange}
					min="100"
					max="500"
					step="5"
				/>
				<button class="btn btn-sm" onclick={incrementWeight} disabled={doughBallWeight >= 500}
					>+5</button
				>
			</div>
		</div>
	</div>

	<div class="filters">
		<div class="search-wrapper">
			<input
				type="search"
				class="search-input input"
				placeholder="Soeg opskrifter..."
				bind:value={searchQuery}
			/>
		</div>

		<div class="category-filter">
			<select class="input" bind:value={selectedCategory}>
				<option value="all">Alle kategorier</option>
				{#each categories as cat}
					<option value={cat}>{categoryLabels[cat]}</option>
				{/each}
			</select>
		</div>
	</div>

	{#if filteredRecipes.length === 0}
		<div class="empty-state">
			<p class="text-secondary">Ingen opskrifter fundet</p>
			{#if searchQuery || selectedCategory !== 'all'}
				<button class="btn btn-secondary" onclick={resetFilters}> Nulstil filtre </button>
			{/if}
		</div>
	{:else}
		<div class="recipe-grid">
			{#each filteredRecipes as recipe (recipe.id)}
				<RecipeCard {recipe} />
			{/each}
		</div>
	{/if}
</div>

<style>
	.recipe-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.pizza-settings {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: var(--spacing-md);
		padding: var(--spacing-md);
		background: var(--color-surface);
		border-radius: var(--radius-md);
	}

	@media (max-width: 400px) {
		.pizza-settings {
			grid-template-columns: 1fr;
		}
	}

	.setting-group {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.setting-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.setting-controls {
		display: flex;
		gap: 4px;
	}

	.setting-controls .btn {
		padding: var(--spacing-sm);
		min-width: 44px;
	}

	.setting-controls .btn-sm {
		font-size: var(--font-size-sm);
	}

	.number-input {
		flex: 1;
		text-align: center;
		font-weight: 600;
	}

	.filters {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		position: sticky;
		top: var(--header-height);
		background: var(--color-background);
		padding: var(--spacing-sm) 0;
		margin: calc(-1 * var(--spacing-sm)) 0 0 0;
		z-index: 50;
	}

	@media (min-width: 480px) {
		.filters {
			flex-direction: row;
		}

		.search-wrapper {
			flex: 1;
		}

		.category-filter {
			min-width: 180px;
		}
	}

	.search-input {
		width: 100%;
	}

	.recipe-grid {
		display: grid;
		gap: var(--spacing-md);
	}

	@media (min-width: 600px) {
		.recipe-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}

	.empty-state {
		text-align: center;
		padding: var(--spacing-xl);
	}

	.empty-state p {
		margin-bottom: var(--spacing-md);
	}
</style>
