<script lang="ts">
	import { pizzaSizes } from '$lib/data/reference';
	import { formatWeight } from '$lib/utils/baker-percentage';
	import type { DoughWorkbench } from '$lib/stores/dough-workbench.svelte';
	import type { SizingMode } from '$lib/utils/dough-planner';

	let { workbench }: { workbench: DoughWorkbench } = $props();

	const modes: { id: SizingMode; labelDa: string }[] = [
		{ id: 'balls', labelDa: 'Kugler' },
		{ id: 'dough', labelDa: 'Dejvægt' },
		{ id: 'flour', labelDa: 'Melvægt' }
	];
</script>

<section class="section" aria-labelledby="sizing-heading">
	<div class="section-head">
		<h2 id="sizing-heading">Hvor meget</h2>
		<div class="segmented" role="group" aria-label="Beregn ud fra">
			{#each modes as mode (mode.id)}
				<button
					type="button"
					class="seg"
					class:active={workbench.sizingMode === mode.id}
					aria-pressed={workbench.sizingMode === mode.id}
					onclick={() => (workbench.sizingMode = mode.id)}
				>
					{mode.labelDa}
				</button>
			{/each}
		</div>
	</div>

	{#if workbench.sizingMode === 'balls'}
		<div class="grid-fields">
			<label class="field">
				<span class="label">Antal</span>
				<div class="with-unit">
					<input
						class="input"
						type="number"
						min="1"
						max="200"
						step="1"
						bind:value={workbench.ballCount}
						aria-label="Antal kugler"
					/>
					<span class="unit">stk</span>
				</div>
			</label>
			<label class="field">
				<span class="label">Vægt pr. kugle</span>
				<div class="with-unit">
					<input
						class="input"
						type="number"
						min="20"
						max="2000"
						step="5"
						bind:value={workbench.ballWeight}
						aria-label="Vægt pr. kugle i gram"
					/>
					<span class="unit">g</span>
				</div>
			</label>
		</div>

		<span class="hint">Hurtigvalg</span>
		<div class="quick-picks">
			{#each pizzaSizes.sizes as size (size.label)}
				<button
					type="button"
					class="pick"
					class:active={workbench.ballWeight === size.neapolitanGrams}
					onclick={() => (workbench.ballWeight = size.neapolitanGrams)}
				>
					{size.labelDa}
					<span class="pick-meta">{size.neapolitanGrams} g</span>
				</button>
			{/each}
			<button
				type="button"
				class="pick"
				class:active={workbench.ballWeight === 450}
				onclick={() => (workbench.ballWeight = 450)}
			>
				Boller/brød
				<span class="pick-meta">450 g</span>
			</button>
		</div>
	{:else if workbench.sizingMode === 'dough'}
		<label class="field">
			<span class="label">Samlet dejvægt</span>
			<div class="with-unit">
				<input
					class="input"
					type="number"
					min="0"
					step="10"
					bind:value={workbench.doughWeight}
					aria-label="Samlet dejvægt i gram"
				/>
				<span class="unit">g</span>
			</div>
			<p class="hint">Til et brød eller en bradepande, hvor dejen ikke deles i kugler.</p>
		</label>
	{:else}
		<label class="field">
			<span class="label">Mel</span>
			<div class="with-unit">
				<input
					class="input"
					type="number"
					min="0"
					step="10"
					bind:value={workbench.flourWeight}
					aria-label="Mel i gram"
				/>
				<span class="unit">g</span>
			</div>
			<p class="hint">Klassisk bagerprocent: alt regnes ud fra melvægten.</p>
		</label>
	{/if}

	{#if workbench.sizingMode !== 'flour'}
		<p class="derived">
			Svarer til <strong>{formatWeight(workbench.resolvedFlourWeight)}</strong> mel
		</p>
	{:else}
		<p class="derived">
			Giver <strong>{formatWeight(workbench.totalDoughWeight)}</strong> dej
		</p>
	{/if}
</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.section-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-sm);
		flex-wrap: wrap;
	}

	.section-head h2 {
		font-size: var(--font-size-lg);
		margin: 0;
	}

	.segmented {
		display: inline-flex;
		gap: 2px;
		padding: 3px;
		background: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
	}

	.seg {
		min-height: 36px;
		padding: 0 var(--spacing-md);
		border-radius: var(--radius-full);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.seg.active {
		background: var(--color-primary);
		color: var(--color-text-light);
	}

	.grid-fields {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--spacing-sm);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.with-unit {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
	}

	.unit {
		padding: 0 var(--spacing-sm);
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.hint {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-xs);
	}

	.quick-picks {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
		align-items: center;
	}

	.pick {
		display: inline-flex;
		align-items: baseline;
		gap: var(--spacing-xs);
		min-height: 44px;
		padding: 0 var(--spacing-sm);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: var(--font-size-sm);
	}

	.pick.active {
		border-color: var(--color-primary);
		color: var(--color-primary);
		font-weight: 600;
	}

	.pick-meta {
		color: var(--color-text-secondary);
		font-size: var(--font-size-xs);
	}

	.derived {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	@media (max-width: 520px) {
		.grid-fields {
			grid-template-columns: 1fr;
		}
	}
</style>
