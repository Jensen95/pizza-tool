<script lang="ts">
	import { recipeHistory, type RecipeHistoryEntry } from '$lib/stores';
	import { getRecipeById } from '$lib/stores';
	import { get } from 'svelte/store';

	let history = $derived($recipeHistory);

	function formatDate(isoDate: string): string {
		const date = new Date(isoDate);
		return date.toLocaleDateString('da-DK', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function deleteEntry(entryId: string) {
		recipeHistory.deleteEntry(entryId);
	}

	function clearAllHistory() {
		if (confirm('Er du sikker pa at du vil slette al historik?')) {
			recipeHistory.clearHistory();
		}
	}

	function getIngredientChanges(entry: RecipeHistoryEntry): { name: string; original: number; custom: number }[] {
		const recipe = get(getRecipeById(entry.recipeId));
		if (!recipe) return [];

		const changes: { name: string; original: number; custom: number }[] = [];
		for (const [ingredientId, customValue] of Object.entries(entry.ingredients)) {
			const ingredient = recipe.ingredients.find((i) => i.id === ingredientId);
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
</script>

<svelte:head>
	<title>Historik - Pizza Tool</title>
</svelte:head>

<div class="history-page">
	<div class="header">
		<h1 class="page-title">Historik</h1>
		{#if history.length > 0}
			<button class="btn btn-secondary" onclick={clearAllHistory}>
				Slet al historik
			</button>
		{/if}
	</div>

	{#if history.length === 0}
		<div class="empty-state">
			<p>Ingen gemte opskrifter endnu.</p>
			<p class="hint">Tilpas ingredienser i en opskrift og klik "Gem til historik" for at gemme dine kreationer.</p>
		</div>
	{:else}
		<div class="history-list">
			{#each history as entry (entry.id)}
				<div class="history-card">
					<div class="card-header">
						<div class="card-info">
							<h3 class="recipe-name">{entry.recipeName}</h3>
							<span class="date">{formatDate(entry.createdAt)}</span>
						</div>
						<button
							class="btn-icon delete-btn"
							onclick={() => deleteEntry(entry.id)}
							title="Slet"
						>
							&#10005;
						</button>
					</div>

					<div class="card-details">
						<div class="detail">
							<span class="detail-label">Pizzaer:</span>
							<span class="detail-value">{entry.numberOfPizzas}</span>
						</div>
						<div class="detail">
							<span class="detail-label">Kuglevaegt:</span>
							<span class="detail-value">{entry.doughBallWeight}g</span>
						</div>
					</div>

					{#if Object.keys(entry.ingredients).length > 0}
						<div class="changes">
							<h4 class="changes-title">Tilpassede ingredienser:</h4>
							<ul class="changes-list">
								{#each getIngredientChanges(entry) as change}
									<li>
										<span class="ingredient-name">{change.name}:</span>
										<span class="ingredient-change">
											{change.original.toFixed(1)}% &rarr; {change.custom.toFixed(1)}%
										</span>
									</li>
								{/each}
							</ul>
						</div>
					{/if}

					<a href="/recipe/{entry.recipeId}" class="btn btn-outline view-recipe-btn">
						Se opskrift
					</a>
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	.history-page {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
	}

	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.page-title {
		margin: 0;
		font-size: var(--font-size-xl);
	}

	.empty-state {
		text-align: center;
		padding: var(--spacing-xl);
		color: var(--color-text-secondary);
	}

	.hint {
		font-size: var(--font-size-sm);
		margin-top: var(--spacing-sm);
	}

	.history-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.history-card {
		background: var(--color-surface);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.card-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.recipe-name {
		margin: 0;
		font-size: var(--font-size-md);
		font-weight: 600;
	}

	.date {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.btn-icon {
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px 8px;
		font-size: var(--font-size-md);
		color: var(--color-text-secondary);
	}

	.btn-icon:hover {
		color: var(--color-error);
	}

	.card-details {
		display: flex;
		gap: var(--spacing-lg);
	}

	.detail {
		display: flex;
		gap: var(--spacing-xs);
	}

	.detail-label {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.detail-value {
		font-weight: 600;
		font-size: var(--font-size-sm);
	}

	.changes {
		background: var(--color-background);
		border-radius: var(--radius-sm);
		padding: var(--spacing-sm);
	}

	.changes-title {
		margin: 0 0 var(--spacing-xs);
		font-size: var(--font-size-sm);
		color: var(--color-primary);
	}

	.changes-list {
		margin: 0;
		padding-left: var(--spacing-md);
		font-size: var(--font-size-sm);
	}

	.changes-list li {
		margin-bottom: 2px;
	}

	.ingredient-name {
		color: var(--color-text-secondary);
	}

	.ingredient-change {
		font-weight: 500;
	}

	.view-recipe-btn {
		align-self: flex-start;
		font-size: var(--font-size-sm);
		padding: var(--spacing-xs) var(--spacing-sm);
	}
</style>
