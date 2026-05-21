<script lang="ts">
	import type { Recipe } from '$lib/models';
	import type { ScaledIngredient } from '$lib/models/ingredient.types';
	import { formatDuration } from '$lib/models/timer.types';
	import { timers, calculator } from '$lib/stores';
	import { formatWeight } from '$lib/utils/baker-percentage';

	let { recipe }: { recipe: Recipe } = $props();

	const locationLabels: Record<string, string> = {
		room: 'Stuetemperatur',
		fridge: 'Koeleskab',
		warm: 'Varmt sted'
	};

	// Look up scaled ingredients by their IDs from a timeline step
	function getStepIngredients(
		ingredientIds: string[] | undefined,
		scaledIngredients: ScaledIngredient[]
	): ScaledIngredient[] {
		if (!ingredientIds || ingredientIds.length === 0) return [];
		const idSet = new Set(ingredientIds);
		return scaledIngredients.filter((ing) => idSet.has(ing.id));
	}

	// Format ingredient for display
	function formatIngredient(ingredient: ScaledIngredient): string {
		return `${formatWeight(ingredient.weight)} ${ingredient.nameDa.toLowerCase()}`;
	}

	function startTimer(label: string, duration: number) {
		timers.create(label, duration, recipe.id);
	}
</script>

<div class="schedule">
	<div class="timeline">
		{#each recipe.timeline as step, index}
			{@const stepIngredients = getStepIngredients(step.ingredients, $calculator.scaledIngredients)}

			<!-- {#if step.section}
				<div class="section-header">
					<h3 class="section-title">{step.section}</h3>
				</div>
			{/if} -->

			<div
				class="stage"
				class:first={index === 0}
				class:last={index === recipe.timeline.length - 1}
			>
				<div class="stage-marker">
					<div class="marker-dot"></div>
					{#if index < recipe.timeline.length - 1}
						<div class="marker-line"></div>
					{/if}
				</div>

				<div class="stage-content">
					<p class="stage-instructions">{step.instructionsDa}</p>

					<div class="stage-details">
						{#if step.duration}
							<span class="stage-duration">{formatDuration(step.duration)}</span>
						{/if}
						{#if step.temperature}
							<span class="stage-temp">{step.temperature}°C</span>
						{/if}
						{#if step.location}
							<span class="stage-location">{locationLabels[step.location]}</span>
						{/if}
					</div>

					{#if stepIngredients.length > 0}
						<div class="stage-ingredients">
							<span class="ingredients-label">Ingredienser:</span>
							<ul class="ingredients-list">
								{#each stepIngredients as ingredient}
									<li>{formatIngredient(ingredient)}</li>
								{/each}
							</ul>
						</div>
					{/if}

					{#if step.tipDa}
						<p class="stage-tip">{step.tipDa}</p>
					{/if}

					{#if step.canSetTimer && step.duration}
						<button
							class="btn btn-outline timer-btn"
							onclick={() =>
								startTimer(step.section || step.instructionsDa.slice(0, 30), step.duration!)}
						>
							Start timer
						</button>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	{#if recipe.tipsDa && recipe.tipsDa.length > 0}
		<div class="schedule-tips">
			<h4 class="tips-title">Tips</h4>
			<ul class="tips-list">
				{#each recipe.tipsDa as tip}
					<li>{tip}</li>
				{/each}
			</ul>
		</div>
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

	.section-header {
		padding: var(--spacing-sm) 0;
	}

	.section-title {
		margin: 0;
		font-size: var(--font-size-md);
		color: var(--color-primary);
		font-weight: 600;
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

	.stage-details {
		display: flex;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-sm);
	}

	.stage-duration {
		font-size: var(--font-size-sm);
		color: var(--color-primary);
		font-weight: 500;
		white-space: nowrap;
	}

	.stage-temp,
	.stage-location {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		background: var(--color-background);
		padding: 2px 8px;
		border-radius: var(--radius-sm);
	}

	.stage-ingredients {
		margin-bottom: var(--spacing-sm);
		padding: var(--spacing-sm);
		background: var(--color-background);
		border-radius: var(--radius-sm);
	}

	.ingredients-label {
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-primary);
		display: block;
		margin-bottom: var(--spacing-xs);
	}

	.ingredients-list {
		margin: 0;
		padding-left: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.ingredients-list li {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.stage-instructions {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--font-size-md);
		color: var(--color-text);
	}

	.stage-tip {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		font-style: italic;
		padding-left: var(--spacing-sm);
		border-left: 2px solid var(--color-primary);
	}

	.timer-btn {
		font-size: var(--font-size-sm);
		padding: var(--spacing-xs) var(--spacing-sm);
		min-height: 36px;
	}

	.schedule-tips {
		padding: var(--spacing-md);
		background: var(--color-background);
		border-radius: var(--radius-md);
	}

	.tips-title {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--font-size-sm);
		color: var(--color-primary);
		font-weight: 600;
	}

	.tips-list {
		margin: 0;
		padding-left: var(--spacing-md);
	}

	.tips-list li {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		margin-bottom: var(--spacing-xs);
	}

	.tips-list li:last-child {
		margin-bottom: 0;
	}
</style>
