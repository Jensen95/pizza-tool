<script lang="ts">
	import { predoughDefaults, type PredoughKind } from '$lib/utils/predough';
	import { formatWeight } from '$lib/utils/baker-percentage';
	import { formatHours } from '$lib/utils/format-plan';
	import type { DoughWorkbench } from '$lib/stores/dough-workbench.svelte';

	let { workbench }: { workbench: DoughWorkbench } = $props();

	const kinds: PredoughKind[] = ['poolish', 'biga'];
	let predough = $derived(workbench.yeastPlan?.predough ?? null);
	let deadlineDriven = $derived(
		workbench.timeMode === 'deadline' && workbench.styleId !== 'custom'
	);
</script>

<section class="section" aria-labelledby="predough-heading">
	<div class="section-head">
		<h2 id="predough-heading">Fordej</h2>
		<label class="toggle">
			<input type="checkbox" bind:checked={workbench.predoughEnabled} aria-label="Brug fordej" />
			<span>Brug fordej</span>
		</label>
	</div>

	{#if !workbench.predoughEnabled}
		<p class="hint">
			En poolish eller biga hæver før hoveddejen og giver smag og struktur. Gæren til fordejen tages
			fra det samme gærbudget.
		</p>
	{:else}
		<div class="kinds" role="group" aria-label="Type fordej">
			{#each kinds as kind (kind)}
				<button
					type="button"
					class="kind"
					class:active={workbench.predough.kind === kind}
					aria-pressed={workbench.predough.kind === kind}
					onclick={() => workbench.setPredoughKind(kind)}
				>
					<strong>{predoughDefaults[kind].nameDa}</strong>
					<span>{predoughDefaults[kind].descriptionDa}</span>
				</button>
			{/each}
		</div>

		<div class="grid-fields">
			<label class="field">
				<span class="label">Andel af melet</span>
				<div class="with-unit">
					<input
						class="input"
						type="number"
						min="5"
						max="100"
						step="5"
						bind:value={workbench.predough.flourPercentage}
						aria-label="Fordejens andel af melet i procent"
					/>
					<span class="unit">%</span>
				</div>
			</label>

			<label class="field">
				<span class="label">Fordejens hydration</span>
				<div class="with-unit">
					<input
						class="input"
						type="number"
						min="30"
						max="120"
						step="5"
						bind:value={workbench.predough.hydrationPercentage}
						aria-label="Fordejens hydration i procent"
					/>
					<span class="unit">%</span>
				</div>
			</label>

			{#if !deadlineDriven}
				<label class="field">
					<span class="label">Ved stuetemperatur</span>
					<div class="with-unit">
						<input
							class="input"
							type="number"
							min="0"
							max="48"
							step="0.5"
							bind:value={workbench.predough.roomHours}
							aria-label="Fordej timer ved stuetemperatur"
						/>
						<span class="unit">timer</span>
					</div>
				</label>

				<label class="field">
					<span class="label">I køleskab</span>
					<div class="with-unit">
						<input
							class="input"
							type="number"
							min="0"
							max="72"
							step="1"
							bind:value={workbench.predough.fridgeHours}
							aria-label="Fordej timer i køleskab"
						/>
						<span class="unit">timer</span>
					</div>
				</label>
			{/if}
		</div>

		{#if deadlineDriven}
			<p class="hint">
				Hævestilen styrer fordejens vindue: {formatHours(workbench.split.predoughHours)} i alt.
			</p>
		{/if}

		{#if predough}
			<p class="derived">
				{predough.nameDa}: <strong>{formatWeight(predough.flourWeight)}</strong> mel +
				<strong>{formatWeight(predough.waterWeight)}</strong>
				vand, {formatHours(predough.totalHours)} hævning
			</p>
		{/if}
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
	}

	.section-head h2 {
		font-size: var(--font-size-lg);
		margin: 0;
	}

	.toggle {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-xs);
		min-height: 44px;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		cursor: pointer;
	}

	.toggle input {
		width: 20px;
		height: 20px;
		accent-color: var(--color-primary);
	}

	.kinds {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--spacing-sm);
	}

	.kind {
		display: flex;
		flex-direction: column;
		gap: 2px;
		text-align: left;
		padding: var(--spacing-sm);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		color: var(--color-text);
		min-height: 44px;
	}

	.kind span {
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.kind.active {
		border-color: var(--color-primary);
		background: rgba(var(--color-primary-rgb), 0.06);
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

	.derived {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	@media (max-width: 620px) {
		.kinds,
		.grid-fields {
			grid-template-columns: 1fr;
		}
	}
</style>
