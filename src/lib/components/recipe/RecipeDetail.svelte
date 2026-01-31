<script lang="ts">
	import type { Recipe } from '$lib/types';
	import { categoryLabels } from '$lib/types';
	import { formatDuration } from '$lib/types/timer';
	import IngredientCalculator from './IngredientCalculator.svelte';
	import FermentationSchedule from './FermentationSchedule.svelte';

	export let recipe: Recipe;

	$: categoryLabel = categoryLabels[recipe.category];
</script>

<div class="recipe-detail">
	<section class="recipe-header">
		<span class="category-badge">{categoryLabel}</span>
		<h1 class="recipe-title">{recipe.nameDa}</h1>
		{#if recipe.descriptionDa}
			<p class="recipe-description">{recipe.descriptionDa}</p>
		{/if}
		<div class="recipe-stats">
			<div class="stat">
				<span class="stat-value">{recipe.hydration}%</span>
				<span class="stat-label">Hydrering</span>
			</div>
			<div class="stat">
				<span class="stat-value">{formatDuration(recipe.schedule.totalTime)}</span>
				<span class="stat-label">Total tid</span>
			</div>
			<div class="stat">
				<span class="stat-value">{recipe.yieldPizzas}</span>
				<span class="stat-label">Pizzaer</span>
			</div>
		</div>
	</section>

	<section class="recipe-section">
		<h2 class="section-title">Beregner</h2>
		<IngredientCalculator {recipe} />
	</section>

	<section class="recipe-section">
		<h2 class="section-title">Tidsplan</h2>
		<FermentationSchedule {recipe} />
	</section>

	{#if recipe.tipsDa && recipe.tipsDa.length > 0}
		<section class="recipe-section">
			<h2 class="section-title">Tips</h2>
			<ul class="tips-list">
				{#each recipe.tipsDa as tip}
					<li class="tip">{tip}</li>
				{/each}
			</ul>
		</section>
	{/if}
</div>

<style>
	.recipe-detail {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.recipe-header {
		text-align: center;
		padding: var(--spacing-md);
		background: var(--color-surface);
		border-radius: var(--radius-md);
	}

	.category-badge {
		display: inline-block;
		background: var(--color-primary);
		color: var(--color-text-light);
		padding: 4px 12px;
		border-radius: var(--radius-full);
		font-size: var(--font-size-sm);
		font-weight: 500;
		margin-bottom: var(--spacing-sm);
	}

	.recipe-title {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--font-size-xl);
	}

	.recipe-description {
		color: var(--color-text-secondary);
		margin: 0 0 var(--spacing-md);
	}

	.recipe-stats {
		display: flex;
		justify-content: center;
		gap: var(--spacing-lg);
		padding-top: var(--spacing-md);
		border-top: 1px solid var(--color-border);
	}

	.stat {
		text-align: center;
	}

	.stat-value {
		display: block;
		font-size: var(--font-size-lg);
		font-weight: 600;
		color: var(--color-primary);
	}

	.stat-label {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.recipe-section {
		background: var(--color-surface);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
	}

	.section-title {
		margin: 0 0 var(--spacing-md);
		font-size: var(--font-size-lg);
		border-bottom: 2px solid var(--color-primary);
		padding-bottom: var(--spacing-sm);
	}

	.tips-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.tip {
		position: relative;
		padding-left: var(--spacing-lg);
		margin-bottom: var(--spacing-sm);
		color: var(--color-text-secondary);
	}

	.tip::before {
		content: '•';
		position: absolute;
		left: 0;
		color: var(--color-primary);
		font-weight: bold;
	}

	.tip:last-child {
		margin-bottom: 0;
	}
</style>
