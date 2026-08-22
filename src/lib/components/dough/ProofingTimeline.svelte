<script lang="ts">
	import { formatClock, formatHours } from '$lib/utils/format-plan';
	import type { ScheduledStep } from '$lib/utils/proofing-styles';

	let { steps }: { steps: ScheduledStep[] } = $props();

	let segments = $derived(steps.filter((step) => step.hours > 0));
	let totalHours = $derived(segments.reduce((sum, step) => sum + step.hours, 0));
	let first = $derived(segments[0]);
	let last = $derived(segments[segments.length - 1]);
</script>

{#if segments.length > 0 && first && last}
	<div class="timeline">
		<div class="bar" role="img" aria-label={`Tidsplan over ${formatHours(totalHours)}`}>
			{#each segments as segment (segment.id)}
				<span
					class="block {segment.kind}"
					style={`flex: ${segment.hours}`}
					title={`${segment.labelDa}: ${formatHours(segment.hours)}`}
				>
					<span class="block-label">{formatHours(segment.hours)}</span>
				</span>
			{/each}
		</div>

		<div class="ticks">
			<span>{formatClock(first.startsAt)}</span>
			<span>{formatClock(last.endsAt)}</span>
		</div>

		<ul class="legend">
			{#each segments as segment (segment.id)}
				<li>
					<span class="swatch {segment.kind}" aria-hidden="true"></span>
					{segment.labelDa}
				</li>
			{/each}
		</ul>
	</div>
{/if}

<style>
	.timeline {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.bar {
		display: flex;
		height: 2.25rem;
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 1px solid var(--color-border);
	}

	.block {
		display: grid;
		place-items: center;
		min-width: 0;
		overflow: hidden;
	}

	.block-label {
		font-size: var(--font-size-xs);
		font-weight: 600;
		color: var(--color-phase-text);
		white-space: nowrap;
		padding: 0 2px;
	}

	.block.predough {
		background: var(--color-predough);
	}

	.block.room {
		background: var(--color-primary);
	}

	.block.fridge {
		background: var(--color-fridge);
	}

	.block.temper {
		background: var(--color-temper);
	}

	.ticks {
		display: flex;
		justify-content: space-between;
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		font-variant-numeric: tabular-nums;
	}

	.legend {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs) var(--spacing-sm);
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
	}

	.legend li {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-xs);
	}

	.swatch {
		width: 10px;
		height: 10px;
		border-radius: 2px;
		display: inline-block;
	}

	.swatch.predough {
		background: var(--color-predough);
	}

	.swatch.room {
		background: var(--color-primary);
	}

	.swatch.fridge {
		background: var(--color-fridge);
	}

	.swatch.temper {
		background: var(--color-temper);
	}
</style>
