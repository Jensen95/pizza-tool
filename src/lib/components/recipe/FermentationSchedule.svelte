<script lang="ts">
	import type { Recipe, FermentationStage } from '$lib/types';
	import type { ScaledIngredient } from '$lib/types/ingredient';
	import { formatDuration } from '$lib/types/timer';
	import { timers, calculator } from '$lib/stores';
	import { formatWeight, isPredoughStage } from '$lib/utils/baker-percentage';

	let { recipe }: { recipe: Recipe } = $props();

	const locationLabels: Record<string, string> = {
		room: 'Stuetemperatur',
		fridge: 'Koeleskab',
		warm: 'Varmt sted'
	};

	// Map schedule stage IDs to ingredient stages
	const scheduleStageToIngredientStage: Record<string, FermentationStage | 'main'> = {
		'stage-1': 'poolish', // First stage is usually predough
		'stage-2': 'main', // Main dough stage
		poolish: 'poolish',
		biga: 'biga',
		preferment: 'preferment',
		main: 'main',
		hoveddej: 'main'
	};

	// Get ingredients for a specific schedule stage
	function getIngredientsForStage(
		stageId: string,
		stageName: string,
		scaledIngredients: ScaledIngredient[]
	): ScaledIngredient[] {
		// Try to determine the ingredient stage from the schedule stage
		const lowerName = stageName.toLowerCase();

		// Check if it's a predough stage
		if (
			lowerName.includes('poolish') ||
			lowerName.includes('biga') ||
			lowerName.includes('fordej')
		) {
			return scaledIngredients.filter((ing) => isPredoughStage(ing.stage));
		}

		// Check if it's a main dough stage
		if (
			lowerName.includes('hoveddej') ||
			lowerName.includes('main') ||
			lowerName.includes('dag 2')
		) {
			return scaledIngredients.filter((ing) => !isPredoughStage(ing.stage) || ing.stage === 'main');
		}

		// Fallback: try to match by stage ID
		const ingredientStage = scheduleStageToIngredientStage[stageId];
		if (ingredientStage) {
			if (ingredientStage === 'main') {
				return scaledIngredients.filter((ing) => !isPredoughStage(ing.stage));
			}
			return scaledIngredients.filter((ing) => ing.stage === ingredientStage);
		}

		return [];
	}

	// Format ingredient for display
	function formatIngredient(ingredient: ScaledIngredient): string {
		return `${formatWeight(ingredient.weight)} ${ingredient.nameDa.toLowerCase()}`;
	}

	function startTimer(stageName: string, duration: number) {
		timers.create(stageName, duration, recipe.id);
	}
</script>

<div class="schedule">
	<div class="timeline">
		{#each recipe.schedule.stages as stage, index}
			{@const stageIngredients = getIngredientsForStage(stage.id, stage.nameDa, $calculator.scaledIngredients)}
			<div
				class="stage"
				class:first={index === 0}
				class:last={index === recipe.schedule.stages.length - 1}
			>
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

					{#if stageIngredients.length > 0}
						<div class="stage-ingredients">
							<span class="ingredients-label">Ingredienser:</span>
							<ul class="ingredients-list">
								{#each stageIngredients as ingredient}
									<li>{formatIngredient(ingredient)}</li>
								{/each}
							</ul>
						</div>
					{/if}

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
