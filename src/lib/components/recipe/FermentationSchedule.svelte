<script lang="ts">
	import type { Recipe } from '$lib/types';
	import { formatDuration } from '$lib/types/timer';
	import { timers } from '$lib/stores';

	let { recipe }: { recipe: Recipe } = $props();

	const locationLabels: Record<string, string> = {
		room: 'Stuetemperatur',
		fridge: 'Koeleskab',
		warm: 'Varmt sted'
	};

	function startTimer(stageName: string, duration: number) {
		timers.create(stageName, duration, recipe.id);
	}
</script>

<div class="schedule">
	<div class="timeline">
		{#each recipe.schedule.stages as stage, index}
			<div class="stage" class:first={index === 0} class:last={index === recipe.schedule.stages.length - 1}>
				<div class="stage-marker">
					<div class="marker-dot"></div>
					{#if index < recipe.schedule.stages.length - 1}
						<div class="marker-line"></div>
					{/if}
				</div>

				<div class="stage-content">
					<div class="stage-header">
						<h4 class="stage-name">{stage.nameDa}</h4>
						<span class="stage-duration">{formatDuration(stage.duration)}</span>
					</div>

					<div class="stage-details">
						{#if stage.temperature}
							<span class="stage-temp">{stage.temperature}°C</span>
						{/if}
						{#if stage.location}
							<span class="stage-location">{locationLabels[stage.location]}</span>
						{/if}
					</div>

					{#if stage.instructionsDa}
						<p class="stage-instructions">{stage.instructionsDa}</p>
					{/if}

					{#if stage.canSetTimer}
						<button
							class="btn btn-outline timer-btn"
							onclick={() => startTimer(stage.nameDa, stage.duration)}
						>
							Start timer
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	{#if recipe.schedule.notesDa}
		<p class="schedule-notes">{recipe.schedule.notesDa}</p>
	{/if}
</div>

<style>
	.schedule {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.timeline {
		display: flex;
		flex-direction: column;
	}

	.stage {
		display: flex;
		gap: var(--spacing-md);
	}

	.stage-marker {
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 24px;
		flex-shrink: 0;
	}

	.marker-dot {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--color-primary);
		border: 3px solid var(--color-surface);
		box-shadow: 0 0 0 2px var(--color-primary);
	}

	.marker-line {
		flex: 1;
		width: 2px;
		background: var(--color-primary);
		opacity: 0.3;
		min-height: 40px;
	}

	.stage-content {
		flex: 1;
		padding-bottom: var(--spacing-lg);
	}

	.stage.last .stage-content {
		padding-bottom: 0;
	}

	.stage-header {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-xs);
	}

	.stage-name {
		margin: 0;
		font-size: var(--font-size-md);
	}

	.stage-duration {
		font-size: var(--font-size-sm);
		color: var(--color-primary);
		font-weight: 500;
		white-space: nowrap;
	}

	.stage-details {
		display: flex;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-sm);
	}

	.stage-temp,
	.stage-location {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		background: var(--color-background);
		padding: 2px 8px;
		border-radius: var(--radius-sm);
	}

	.stage-instructions {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.timer-btn {
		font-size: var(--font-size-sm);
		padding: var(--spacing-xs) var(--spacing-sm);
		min-height: 36px;
	}

	.schedule-notes {
		margin: 0;
		padding: var(--spacing-md);
		background: var(--color-background);
		border-radius: var(--radius-md);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}
</style>
