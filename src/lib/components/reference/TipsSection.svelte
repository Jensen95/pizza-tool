<!-- ABOUTME: Tips by category + reheating methods + water temperature formula -->
<script lang="ts">
	import { getTipsByCategory, reheatingMethods, waterTempFormula } from '$lib/data/reference';
	import { tipCategoryLabels } from '$lib/models';
	import type { Tip } from '$lib/models';

	const categories: Tip['category'][] = [
		'dough',
		'technique',
		'ingredients',
		'baking',
		'equipment',
		'general'
	];

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

	<h3 class="extra-heading">Opvarmning af pizza</h3>
	{#each reheatingMethods as method}
		<div class="category-section">
			<div class="reheat-header">
				<h4 class="category-title">{method.nameDa}</h4>
				<span class="reheat-rating">{method.rating}</span>
			</div>
			<ol class="reheat-steps">
				{#each method.instructionsDa as step}
					<li>{step}</li>
				{/each}
			</ol>
			{#if method.tipsDa && method.tipsDa.length > 0}
				<ul class="reheat-tips">
					{#each method.tipsDa as tip}
						<li>{tip}</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/each}

	<h3 class="extra-heading">Vandtemperatur formel</h3>
	<div class="category-section">
		<p class="formula-text">{waterTempFormula.formulaDa}</p>
		<div class="formula-details">
			<div class="detail-row">
				<span class="detail-label">Friktion (lav hast.):</span>
				<span class="detail-value">{waterTempFormula.frictionHeat.lowSpeedPerMin}°C/min</span>
			</div>
			<div class="detail-row">
				<span class="detail-label">Friktion (mellem hast.):</span>
				<span class="detail-value">{waterTempFormula.frictionHeat.mediumSpeedPerMin}°C/min</span>
			</div>
			<div class="detail-row">
				<span class="detail-label">Mål dejtemp:</span>
				<span class="detail-value"
					>{waterTempFormula.targetDoughTemp.min}-{waterTempFormula.targetDoughTemp.max}°C</span
				>
			</div>
			<p class="formula-note">{waterTempFormula.targetDoughTemp.notesDa}</p>
		</div>
		<p class="formula-example">{waterTempFormula.exampleDa}</p>
	</div>
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

	.extra-heading {
		margin: 0;
		font-size: var(--font-size-md);
		color: var(--color-primary);
	}

	.reheat-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.reheat-rating {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-primary);
	}

	.reheat-steps {
		margin: 0;
		padding-left: var(--spacing-lg);
	}

	.reheat-steps li {
		margin-bottom: 4px;
		font-size: var(--font-size-sm);
	}

	.reheat-tips {
		margin: var(--spacing-sm) 0 0;
		padding-left: var(--spacing-lg);
		border-top: 1px solid var(--color-border);
		padding-top: var(--spacing-sm);
	}

	.reheat-tips li {
		margin-bottom: 4px;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		font-style: italic;
	}

	.formula-text {
		margin: 0 0 var(--spacing-md);
		font-family: monospace;
		font-size: var(--font-size-sm);
		color: var(--color-text);
	}

	.formula-details {
		display: flex;
		flex-direction: column;
		gap: 4px;
		margin-bottom: var(--spacing-md);
	}

	.detail-row {
		display: flex;
		gap: var(--spacing-sm);
		font-size: var(--font-size-sm);
	}

	.detail-label {
		color: var(--color-text-secondary);
		min-width: 160px;
	}

	.detail-value {
		color: var(--color-text);
	}

	.formula-note {
		margin: var(--spacing-xs) 0 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		font-style: italic;
	}

	.formula-example {
		margin: 0;
		padding: var(--spacing-sm) var(--spacing-md);
		background: var(--color-surface);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		border: 1px solid var(--color-border);
	}
</style>
