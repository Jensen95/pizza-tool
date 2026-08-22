<script lang="ts">
	import { doughPlans, type SavedDoughPlan } from '$lib/stores/dough-plans';
	import { formatHours, formatSavedDate } from '$lib/utils/format-plan';
	import type { DoughWorkbench } from '$lib/stores/dough-workbench.svelte';

	let { workbench }: { workbench: DoughWorkbench } = $props();

	let savedMessage = $state('');

	function savePlan() {
		doughPlans.savePlan(workbench.name, workbench.plannerState);
		savedMessage = 'Planen er gemt.';
		setTimeout(() => (savedMessage = ''), 3000);
	}

	function summary(saved: SavedDoughPlan): string {
		const parts = [`${saved.input.hydrationPercentage} % hydration`];
		if (saved.input.leavening === 'sourdough') {
			parts.push(`${saved.input.starterPercentage ?? 20} % surdej`);
		} else {
			const hours =
				Math.max(0, saved.input.roomHours) +
				Math.max(0, saved.input.fridgeHours) +
				Math.max(0, saved.input.temperHours ?? 0);
			parts.push(formatHours(hours));
		}
		if (saved.input.predough) parts.push(saved.input.predough.kind);
		return parts.join(' · ');
	}
</script>

<section class="section" aria-labelledby="saved-heading">
	<h2 id="saved-heading">Gem som opskrift</h2>

	<div class="save-row">
		<label class="sr-only" for="plan-name">Navn på opskrift</label>
		<input
			class="input"
			id="plan-name"
			type="text"
			placeholder="Navn, fx Focaccia lørdag"
			bind:value={workbench.name}
		/>
		<button class="btn btn-primary" type="button" onclick={savePlan} disabled={!workbench.hasPlan}>
			Gem plan
		</button>
	</div>

	{#if savedMessage}
		<p class="saved-message" role="status">{savedMessage}</p>
	{/if}

	<p class="hint">
		Tidspunktet gemmes ikke — timerne gør. Når du indlæser en plan, kan du lægge den på et nyt
		klokkeslæt.
	</p>

	{#if $doughPlans.length > 0}
		<ul class="saved-list">
			{#each $doughPlans as saved (saved.id)}
				<li class="saved-item">
					<div class="saved-info">
						<span class="saved-name">{saved.name}</span>
						<span class="hint">{formatSavedDate(saved.createdAt)} · {summary(saved)}</span>
					</div>
					<div class="saved-actions">
						<button
							class="btn btn-secondary small"
							type="button"
							onclick={() => workbench.load(saved.input, saved.name)}
						>
							Indlæs
						</button>
						<button
							class="btn btn-secondary small danger"
							type="button"
							aria-label={`Slet ${saved.name}`}
							onclick={() => doughPlans.deletePlan(saved.id)}
						>
							Slet
						</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.section h2 {
		font-size: var(--font-size-lg);
		margin: 0;
	}

	.save-row {
		display: flex;
		gap: var(--spacing-sm);
	}

	.save-row .input {
		flex: 1;
		min-width: 0;
	}

	.hint {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-xs);
	}

	.saved-message {
		margin: 0;
		color: var(--color-primary);
		font-size: var(--font-size-sm);
	}

	.saved-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.saved-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-background);
	}

	.saved-info {
		display: flex;
		flex-direction: column;
		min-width: 0;
	}

	.saved-name {
		font-weight: 600;
	}

	.saved-actions {
		display: flex;
		gap: var(--spacing-xs);
		flex-shrink: 0;
	}

	.small {
		min-height: 40px;
		padding: 0 var(--spacing-sm);
		font-size: var(--font-size-xs);
	}

	.danger {
		color: var(--color-error);
	}

	@media (max-width: 520px) {
		.saved-item {
			flex-direction: column;
			align-items: stretch;
		}

		.saved-actions {
			justify-content: flex-end;
		}
	}
</style>
