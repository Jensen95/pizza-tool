<script lang="ts">
	import { get } from 'svelte/store';
	import type { Recipe, RecipeCategory } from '$lib/models';
	import { recipes } from '$lib/stores';
	import RecipeCard from './RecipeCard.svelte';
	import { categoryLabels } from '$lib/models';

	let searchQuery = $state('');
	let selectedCategory = $state<RecipeCategory | 'all'>('all');

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
	<div class="filters">
		<div class="search-wrapper">
			<input
				type="search"
				class="search-input input"
				placeholder="Søg opskrifter..."
				bind:value={searchQuery}
			/>
		</div>

		<div class="category-filter">
			<button
				class="filter-chip"
				class:active={selectedCategory === 'all'}
				onclick={() => (selectedCategory = 'all')}
			>
				Alle
			</button>
			{#each categories as cat}
				<button
					class="filter-chip"
					class:active={selectedCategory === cat}
					onclick={() => (selectedCategory = cat)}
				>
					{categoryLabels[cat]}
				</button>
			{/each}
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

	.category-filter {
		display: flex;
		gap: var(--spacing-xs);
		overflow-x: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
		padding-bottom: 2px;
	}

	.category-filter::-webkit-scrollbar {
		display: none;
	}

	.filter-chip {
		display: inline-flex;
		align-items: center;
		white-space: nowrap;
		padding: 6px var(--spacing-sm);
		border-radius: var(--radius-full);
		border: 1.5px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		font-weight: 500;
		cursor: pointer;
		transition: all 0.15s;
		min-height: 36px;
	}

	.filter-chip:hover {
		border-color: var(--color-primary);
		color: var(--color-primary);
	}

	.filter-chip.active {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-text-light);
	}
</style>
