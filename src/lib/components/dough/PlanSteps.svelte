<script lang="ts">
	import { timers } from '$lib/stores/timers';
	import { formatClock, formatHours } from '$lib/utils/format-plan';
	import type { ScheduledStep } from '$lib/utils/proofing-styles';

	let { steps }: { steps: ScheduledStep[] } = $props();

	let startedId = $state('');

	function startTimer(step: ScheduledStep) {
		timers.create(step.labelDa, Math.round(step.hours * 60));
		startedId = step.id;
		setTimeout(() => (startedId = ''), 3000);
	}
</script>

<ol class="steps">
	{#each steps as step (step.id)}
		<li>
			<span class="clock">{formatClock(step.startsAt)}</span>
			<span class="what">
				{step.labelDa}
				{#if step.hours > 0}
					<span class="duration">{formatHours(step.hours)}</span>
				{/if}
			</span>
			{#if step.canTimer}
				<button class="btn btn-secondary timer-btn" type="button" onclick={() => startTimer(step)}>
					{startedId === step.id ? 'Timer startet' : 'Start timer'}
				</button>
			{/if}
		</li>
	{/each}
</ol>

<p class="hint">
	En timer tæller ned fra nu, så start den, når du står ved trinnet. Lange køleskabstrin får et
	klokkeslæt i stedet.
</p>

<style>
	.steps {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
	}

	.steps li {
		display: grid;
		grid-template-columns: 5.5rem 1fr auto;
		gap: var(--spacing-sm);
		align-items: center;
		padding: var(--spacing-xs) 0;
		border-bottom: 1px solid var(--color-border);
		font-size: var(--font-size-sm);
	}

	.steps li:last-child {
		border-bottom: none;
	}

	.clock {
		font-variant-numeric: tabular-nums;
		color: var(--color-text-secondary);
		font-size: var(--font-size-xs);
	}

	.what {
		display: flex;
		flex-direction: column;
	}

	.duration {
		color: var(--color-text-secondary);
		font-size: var(--font-size-xs);
	}

	.timer-btn {
		min-height: 36px;
		padding: 0 var(--spacing-sm);
		font-size: var(--font-size-xs);
	}

	.hint {
		margin: var(--spacing-xs) 0 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-xs);
	}
</style>
