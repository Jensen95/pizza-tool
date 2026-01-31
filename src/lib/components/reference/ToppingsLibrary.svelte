<script lang="ts">
	import { toppings, getToppingsByCategory } from '$lib/data/reference';
	import { toppingCategoryLabels } from '$lib/types';
	import type { Topping } from '$lib/types';

	const categories: Topping['category'][] = ['cheese', 'meat', 'vegetable', 'herb', 'sauce', 'other'];

	$: groupedToppings = categories
		.map((cat) => ({
			category: cat,
			label: toppingCategoryLabels[cat],
			items: getToppingsByCategory(cat)
		}))
		.filter((g) => g.items.length > 0);
</script>

<div class="toppings-library">
	{#each groupedToppings as group}
		<div class="category-section">
			<h4 class="category-title">{group.label}</h4>
			<div class="toppings-grid">
				{#each group.items as topping}
					<div class="topping-chip">
						{topping.nameDa}
					</div>
				{/each}
			</div>
		</div>
	{/each}
</div>

<style>
	.toppings-library {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.category-section {
		background: var(--color-background);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
	}

	.category-title {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--font-size-md);
		color: var(--color-primary);
	}

	.toppings-grid {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
	}

	.topping-chip {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		padding: 4px 12px;
		font-size: var(--font-size-sm);
	}
</style>
