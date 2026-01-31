<script lang="ts">
	import type { Recipe, RecipeCategory } from '$lib/types';
	import { recipes, recipeGroups, searchRecipes } from '$lib/stores';
	import RecipeCard from './RecipeCard.svelte';
	import { categoryLabels } from '$lib/types';

	let searchQuery = '';
	let selectedCategory: RecipeCategory | 'all' = 'all';

	$: filteredRecipes = getFilteredRecipes(searchQuery, selectedCategory, $recipes);

	function getFilteredRecipes(query: string, category: RecipeCategory | 'all', allRecipes: Recipe[]): Recipe[] {
		let result = allRecipes;

		if (query.trim()) {
			const lowerQuery = query.toLowerCase();
			result = result.filter(
				(r) =>
					r.name.toLowerCase().includes(lowerQuery) ||
					r.nameDa.toLowerCase().includes(lowerQuery)
			);
		}

		if (category !== 'all') {
			result = result.filter((r) => r.category === category);
		}

		return result;
	}

	$: categories = Array.from(new Set($recipes.map((r) => r.category)));
</script>

<div class="recipe-list">
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
				<button class="btn btn-secondary" on:click={() => { searchQuery = ''; selectedCategory = 'all'; }}>
					Nulstil filtre
				</button>
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

	.filters {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
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
