<script lang="ts">
	import type { Recipe } from '$lib/types';
	import type { ScaledIngredient } from '$lib/types/ingredient';
	import { calculator } from '$lib/stores';
	import { formatWeight, isPredoughStage } from '$lib/utils/baker-percentage';
	import DoughControls from './DoughControls.svelte';

	let { recipe }: { recipe: Recipe } = $props();

	// Set recipe in calculator when recipe changes
	$effect(() => {
		calculator.setRecipe(recipe);
	});

	const stageLabels: Record<string, string> = {
		poolish: 'Poolish',
		biga: 'Biga',
		preferment: 'Fordej',
		autolyse: 'Autolyse',
		bulk: 'Stuehavning',
		ball: 'Kugler',
		final: 'Final',
		hoveddej: 'Hoveddej',
		main: 'Hoveddej'
	};

	type StageIngredientGroup = {
		stage: string;
		flours: ScaledIngredient[];
		others: ScaledIngredient[];
	};

	function createPredoughSummary(ingredients: ScaledIngredient[]): ScaledIngredient | null {
		const predoughIngredients = ingredients.filter((ing) => isPredoughStage(ing.stage));
		if (predoughIngredients.length === 0) return null;

		const totalPredoughWeight = predoughIngredients.reduce((sum, ing) => sum + ing.weight, 0);
		if (totalPredoughWeight <= 0) return null;

		const mainFlourWeight = ingredients
			.filter((ing) => ing.type === 'flour' && !isPredoughStage(ing.stage))
			.reduce((sum, ing) => sum + ing.weight, 0);

		const stagePercentage =
			mainFlourWeight > 0 ? Math.round((totalPredoughWeight / mainFlourWeight) * 10000) / 100 : 0;

		const stageLabel = stageLabels[predoughIngredients[0].stage || 'preferment'] || 'Fordej';
		const totalPercentage = predoughIngredients.reduce((sum, ing) => sum + ing.percentage, 0);

		return {
			id: 'predough-total',
			name: `${stageLabel} predough`,
			nameDa: stageLabel,
			percentage: totalPercentage,
			stagePercentage,
			weight: totalPredoughWeight,
			type: 'other',
			stage: 'main'
		};
	}

	function groupIngredientsByStage(ingredients: ScaledIngredient[]): StageIngredientGroup[] {
		const groups = new Map<string, ScaledIngredient[]>();

		for (const ing of ingredients) {
			const stage = ing.stage || 'main';
			const existing = groups.get(stage) || [];
			existing.push(ing);
			groups.set(stage, existing);
		}

		const predoughSummary = createPredoughSummary(ingredients);
		if (predoughSummary) {
			const mainGroup = groups.get('main') || [];
			if (!mainGroup.find((ing) => ing.id === predoughSummary.id)) {
				groups.set('main', [predoughSummary, ...mainGroup]);
			}
		}

		return Array.from(groups.entries()).map(([stage, stageIngredients]) => ({
			stage,
			flours: stageIngredients.filter((ing) => ing.type === 'flour'),
			others: stageIngredients.filter((ing) => ing.type !== 'flour')
		}));
	}

	let ingredientGroups = $derived(groupIngredientsByStage($calculator.scaledIngredients));
	let hasPredough = $derived($calculator.scaledIngredients.some((i) => isPredoughStage(i.stage)));
</script>

<div class="calculator">
	<DoughControls {recipe} />

	<div class="ingredients">
		{#each ingredientGroups as group}
			<div class="ingredient-group">
				<h4 class="group-title">{stageLabels[group.stage] || group.stage}</h4>

				<table class="ingredient-table">
					<thead>
						<tr>
							<th>Ingrediens</th>
							<th class="right">Procent</th>
							<th class="right">Vaegt</th>
						</tr>
					</thead>
					<tbody>
						{#if group.flours.length > 1}
							<tr class="flour-heading">
								<td colspan="3">Mel ({group.flours.length} typer)</td>
							</tr>
						{/if}
						{#each group.flours as ingredient}
							{#if !(hasPredough && ingredient.type === 'flour' && ingredient.weight <= 0)}
								<tr class="flour-row">
									<td>
										{ingredient.nameDa}
										{#if hasPredough && ingredient.type === 'flour' && isPredoughStage(ingredient.stage)}
											<span class="flour-ratio-badge">
												{ingredient.percentage.toFixed(0)}% af total
											</span>
										{/if}
									</td>
									<td class="right">
										{ingredient.stagePercentage.toFixed(2)}%
									</td>
									<td class="right weight">
										{formatWeight(ingredient.weight)}
									</td>
								</tr>
							{/if}
						{/each}

						{#each group.others as ingredient}
							{#if !(hasPredough && ingredient.type === 'flour' && ingredient.weight <= 0)}
								<tr>
									<td>{ingredient.nameDa}</td>
									<td class="right">
										{ingredient.stagePercentage.toFixed(2)}%
									</td>
									<td class="right weight">
										{formatWeight(ingredient.weight)}
									</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		{/each}
	</div>
</div>

<style>
	.calculator {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.ingredients {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.ingredient-group {
		background: var(--color-background);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
	}

	.group-title {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--font-size-md);
		color: var(--color-primary);
	}

	.ingredient-table {
		width: 100%;
		border-collapse: collapse;
	}

	.ingredient-table th,
	.ingredient-table td {
		padding: var(--spacing-xs) var(--spacing-sm);
		text-align: left;
	}

	.ingredient-table th {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		font-weight: 500;
		border-bottom: 1px solid var(--color-border);
	}

	.ingredient-table td {
		border-bottom: 1px solid var(--color-border);
	}

	.ingredient-table tr:last-child td {
		border-bottom: none;
	}

	.right {
		text-align: right;
	}

	.weight {
		font-weight: 600;
		color: var(--color-primary);
	}

	.flour-ratio-badge {
		display: inline-block;
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		background: var(--color-surface);
		padding: 1px 6px;
		border-radius: var(--radius-sm);
		margin-left: var(--spacing-xs);
	}

	.flour-heading td {
		font-weight: 600;
		color: var(--color-text-secondary);
		background: var(--color-surface);
		text-transform: uppercase;
		letter-spacing: 0.02em;
		border-left: 4px solid var(--color-primary);
	}

	.flour-row td {
		padding-left: var(--spacing-md);
		background: var(--color-surface);
		border-left: 4px solid var(--color-primary);
	}
</style>
