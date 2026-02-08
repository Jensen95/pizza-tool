<script lang="ts">
	import type { Recipe } from '$lib/types';
	import { categoryLabels } from '$lib/types';
	import { formatDuration } from '$lib/types/timer';

	let { recipe }: { recipe: Recipe } = $props();

	let categoryLabel = $derived(categoryLabels[recipe.category]);
	let totalTimeFormatted = $derived(formatDuration(recipe.schedule.totalTime));
	let ingredientCount = $derived(recipe.ingredients.length);
</script>

<a href="/recipe/{recipe.id}" class="recipe-card">
	<div class="card-header">
		<h3 class="recipe-name">{recipe.nameDa}</h3>
		<span class="category-badge">{categoryLabel}</span>
	</div>
	<div class="recipe-stats">
		<div class="stat">
			<span class="stat-value">{recipe.hydration}%</span>
			<span class="stat-label">Hydrering</span>
		</div>
		<div class="stat">
			<span class="stat-value">{totalTimeFormatted}</span>
			<span class="stat-label">Tid</span>
		</div>
		<div class="stat">
			<span class="stat-value">{ingredientCount}</span>
			<span class="stat-label">Ingredienser</span>
		</div>
	</div>
</a>

<style>
	.recipe-card {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
		padding: var(--spacing-md);
		background: var(--color-surface);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-sm);
		text-decoration: none;
		color: inherit;
		transition:
			box-shadow 0.2s,
			transform 0.1s;
	}

	.recipe-card:hover {
		box-shadow: var(--shadow-md);
		transform: translateY(-2px);
		text-decoration: none;
	}

	.card-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--spacing-sm);
	}

	.category-badge {
		background: var(--color-primary);
		color: var(--color-text-light);
		padding: 2px 10px;
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: 500;
		flex-shrink: 0;
		white-space: nowrap;
	}

	.recipe-name {
		margin: 0;
		font-size: var(--font-size-md);
		font-weight: 600;
		color: var(--color-text);
		flex: 1;
		min-width: 0;
	}

	.recipe-stats {
		display: flex;
		gap: var(--spacing-md);
		padding-top: var(--spacing-sm);
		border-top: 1px solid var(--color-border);
	}

	.stat {
		flex: 1;
		text-align: center;
	}

	.stat-value {
		display: block;
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-primary);
	}

	.stat-label {
		display: block;
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}
</style>
