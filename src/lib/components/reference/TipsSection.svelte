<script lang="ts">
	import { getTipsByCategory } from '$lib/data/reference';
	import { tipCategoryLabels } from '$lib/types';
	import type { Tip } from '$lib/types';

	const categories: Tip['category'][] = ['dough', 'technique', 'ingredients', 'baking', 'equipment', 'general'];

	let groupedTips = $derived(
		categories
			.map((cat) => ({
				category: cat,
				label: tipCategoryLabels[cat],
				items: getTipsByCategory(cat)
			}))
			.filter((g) => g.items.length > 0)
	);

	let expandedTipId = $state<string | null>(null);

	function toggleTip(tipId: string) {
		expandedTipId = expandedTipId === tipId ? null : tipId;
	}
</script>

<div class="tips-section">
	{#each groupedTips as group}
		<div class="category-section">
			<h4 class="category-title">{group.label}</h4>
			<div class="tips-list">
				{#each group.items as tip}
					<button
						class="tip-item"
						class:expanded={expandedTipId === tip.id}
						onclick={() => toggleTip(tip.id)}
					>
						<div class="tip-header">
							<span class="tip-title">{tip.titleDa}</span>
							<span class="tip-toggle">{expandedTipId === tip.id ? '−' : '+'}</span>
						</div>
						{#if expandedTipId === tip.id}
							<p class="tip-content">{tip.contentDa}</p>
						{/if}
					</button>
				{/each}
			</div>
		</div>
	{/each}
</div>

<style>
	.tips-section {
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

	.tips-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.tip-item {
		width: 100%;
		text-align: left;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--spacing-sm) var(--spacing-md);
		cursor: pointer;
		transition: border-color 0.2s;
	}

	.tip-item:hover {
		border-color: var(--color-primary);
	}

	.tip-item.expanded {
		border-color: var(--color-primary);
	}

	.tip-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.tip-title {
		font-weight: 500;
	}

	.tip-toggle {
		font-size: var(--font-size-lg);
		color: var(--color-primary);
		font-weight: 600;
	}

	.tip-content {
		margin: var(--spacing-sm) 0 0;
		padding-top: var(--spacing-sm);
		border-top: 1px solid var(--color-border);
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.6;
	}
</style>
