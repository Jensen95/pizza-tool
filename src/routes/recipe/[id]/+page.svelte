<script lang="ts">
	import { page } from '$app/state';
	import { getRecipeById, recipeHistory, calculator } from '$lib/stores';
	import RecipeDetail from '$lib/components/recipe/RecipeDetail.svelte';
	import IngredientCalculator from '$lib/components/recipe/IngredientCalculator.svelte';
	import FermentationSchedule from '$lib/components/recipe/FermentationSchedule.svelte';
	import KeepAwakeToggle from '$lib/components/timer/KeepAwakeToggle.svelte';
	import type { RecipeHistoryEntry } from '$lib/stores';
	import { getAllIngredients } from '$lib/utils/baker-percentage';

	let recipeId = $derived(page.params.id);
	let recipe = $derived(recipeId ? getRecipeById(recipeId) : undefined);
	let showHistory = $state(false);

	let recipeHistoryEntries = $derived(
		recipeId ? $recipeHistory.filter((e) => e.recipeId === recipeId) : []
	);

	function toggleHistory() {
		showHistory = !showHistory;
	}

	function formatDate(isoDate: string): string {
		const date = new Date(isoDate);
		return date.toLocaleDateString('da-DK', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function getIngredientChanges(
		entry: RecipeHistoryEntry
	): { name: string; original: number; custom: number }[] {
		if (!recipe) return [];

		const changes: { name: string; original: number; custom: number }[] = [];
		const allIngredients = getAllIngredients(recipe);
		for (const [ingredientId, customValue] of Object.entries(entry.ingredients)) {
			const ingredient = allIngredients.find((i) => i.id === ingredientId);
			if (ingredient) {
				changes.push({
					name: ingredient.nameDa,
					original: ingredient.percentage,
					custom: customValue
				});
			}
		}
		return changes;
	}

	function deleteHistoryEntry(entryId: string) {
		recipeHistory.deleteEntry(entryId);
	}

	function applyHistoryEntry(entry: RecipeHistoryEntry) {
		// Apply the custom ingredient percentages
		calculator.applyCustomIngredients(entry.ingredients);
		// Apply pizza count and weight
		calculator.setNumberOfPizzas(entry.numberOfPizzas);
		calculator.setDoughBallWeight(entry.doughBallWeight);
		// Apply hydration and predough
		const hydration = entry.hydration ?? null;
		if (hydration === null) {
			calculator.resetHydration();
		} else {
			calculator.setHydration(hydration);
		}
		calculator.setPredoughRatio(entry.predoughRatio ?? null);
		// Close history panel
		showHistory = false;
	}
</script>

<svelte:head>
	<title>{recipe?.nameDa ?? 'Opskrift'} - Pizza Tool</title>
</svelte:head>

{#if recipe}
	<div class="recipe-page">
		<a href="/" class="back-link">&larr; Tilbage til opskrifter</a>
		<KeepAwakeToggle />
		<RecipeDetail {recipe} />

		<section class="recipe-section">
			<div class="section-header">
				<h2 class="section-title">Tidsplan</h2>
			</div>
			<FermentationSchedule {recipe} />
		</section>

		<section class="recipe-section">
			<div class="section-header">
				<h2 class="section-title">Ingredienser</h2>
				{#if recipeHistoryEntries.length > 0}
					<button class="btn btn-outline btn-sm" onclick={toggleHistory}>
						{showHistory ? 'Skjul historik' : `Historik (${recipeHistoryEntries.length})`}
					</button>
				{/if}
			</div>

			{#if showHistory && recipeHistoryEntries.length > 0}
				<div class="history-section">
					<h3 class="history-title">Tidligere tilpasninger</h3>
					<div class="history-list">
						{#each recipeHistoryEntries as entry (entry.id)}
							<button class="history-entry" onclick={() => applyHistoryEntry(entry)}>
								<div class="entry-header">
									<span class="entry-date">{formatDate(entry.createdAt)}</span>
									<span class="entry-info"
										>{entry.numberOfPizzas} pizzaer, {entry.doughBallWeight}g</span
									>
									<span
										class="btn-icon delete-btn"
										role="button"
										tabindex="0"
										onclick={(e) => {
											e.stopPropagation();
											deleteHistoryEntry(entry.id);
										}}
										onkeydown={(e) => {
											if (e.key === 'Enter') {
												e.stopPropagation();
												deleteHistoryEntry(entry.id);
											}
										}}
										title="Slet"
									>
										&times;
									</span>
								</div>
								{#if Object.keys(entry.ingredients).length > 0}
									<ul class="entry-changes">
										{#each getIngredientChanges(entry) as change}
											<li>
												{change.name}: {change.original.toFixed(1)}% &rarr; {change.custom.toFixed(
													1
												)}%
											</li>
										{/each}
									</ul>
								{/if}
								<span class="apply-hint">Klik for at anvende</span>
							</button>
						{/each}
					</div>
				</div>
			{/if}

			<IngredientCalculator {recipe} />
		</section>
	</div>
{:else}
	<div class="not-found">
		<h2>Opskrift ikke fundet</h2>
		<p>Den opskrift du leder efter findes ikke.</p>
		<a href="/" class="btn btn-primary">Tilbage til opskrifter</a>
	</div>
{/if}

<style>
	.recipe-page {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-xs);
		color: var(--color-text-secondary);
		text-decoration: none;
		font-size: var(--font-size-sm);
		transition: color 0.2s;
	}

	.back-link:hover {
		color: var(--color-primary);
	}

	.recipe-section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.section-title {
		margin: 0;
		font-size: var(--font-size-lg);
	}

	.btn-sm {
		font-size: var(--font-size-sm);
		padding: var(--spacing-xs) var(--spacing-sm);
	}

	.history-section {
		background: var(--color-surface);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		margin-bottom: var(--spacing-sm);
	}

	.history-title {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--font-size-md);
		color: var(--color-primary);
	}

	.history-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.history-entry {
		display: block;
		width: 100%;
		text-align: left;
		background: var(--color-background);
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		padding: var(--spacing-sm);
		cursor: pointer;
		transition:
			border-color 0.2s,
			background-color 0.2s;
	}

	.history-entry:hover {
		border-color: var(--color-primary);
		background: var(--color-surface);
	}

	.entry-header {
		display: flex;
		align-items: center;
		gap: var(--spacing-sm);
		margin-bottom: var(--spacing-xs);
	}

	.entry-date {
		font-weight: 500;
		font-size: var(--font-size-sm);
	}

	.entry-info {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		flex: 1;
	}

	.btn-icon {
		background: none;
		border: none;
		cursor: pointer;
		padding: 2px 6px;
		font-size: var(--font-size-lg);
		color: var(--color-text-secondary);
		line-height: 1;
	}

	.btn-icon:hover {
		color: var(--color-error);
	}

	.entry-changes {
		margin: 0;
		padding-left: var(--spacing-md);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.apply-hint {
		display: block;
		margin-top: var(--spacing-xs);
		font-size: var(--font-size-xs);
		color: var(--color-primary);
		opacity: 0;
		transition: opacity 0.2s;
	}

	.history-entry:hover .apply-hint {
		opacity: 1;
	}

	.delete-btn:hover {
		color: var(--color-error);
	}

	.not-found {
		text-align: center;
		padding: var(--spacing-xl);
	}

	.not-found h2 {
		margin: 0 0 var(--spacing-sm);
	}

	.not-found p {
		color: var(--color-text-secondary);
		margin: 0 0 var(--spacing-lg);
	}
</style>
