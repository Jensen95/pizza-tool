<script lang="ts">
	import type { Recipe } from '$lib/types';
	import { categoryLabels } from '$lib/types';
	import { formatDuration } from '$lib/types/timer';

	let { recipe }: { recipe: Recipe } = $props();

	let categoryLabel = $derived(categoryLabels[recipe.category]);
	let totalTimeFormatted = $derived(formatDuration(recipe.schedule.totalTime));
</script>

<a href="/recipe/{recipe.id}" class="recipe-card">
	<div class="recipe-info">
		<h3 class="recipe-name">{recipe.nameDa}</h3>
		<div class="recipe-meta">
			<span class="category-badge">{categoryLabel}</span>
			<span class="hydration">{recipe.hydration}% hydrering</span>
		</div>
	</div>
	<div class="recipe-details">
		<div class="detail">
			<span class="detail-icon">⏱️</span>
			<span class="detail-value">{totalTimeFormatted}</span>
		</div>
		<div class="detail">
			<span class="detail-icon">🍕</span>
			<span class="detail-value">{recipe.yieldPizzas} stk</span>
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

	.recipe-info {
		flex: 1;
	}

	.recipe-name {
		margin: 0 0 var(--spacing-xs);
		font-size: var(--font-size-md);
		font-weight: 600;
		color: var(--color-text);
	}

	.recipe-meta {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
		align-items: center;
	}

	.category-badge {
		background: var(--color-primary);
		color: var(--color-text-light);
		padding: 2px 8px;
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
		font-weight: 500;
	}

	.hydration {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.recipe-details {
		display: flex;
		gap: var(--spacing-md);
		padding-top: var(--spacing-sm);
		border-top: 1px solid var(--color-border);
	}

	.detail {
		display: flex;
		align-items: center;
		gap: 4px;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.detail-icon {
		font-size: 1rem;
	}
</style>
