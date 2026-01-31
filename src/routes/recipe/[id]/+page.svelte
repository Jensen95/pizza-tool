<script lang="ts">
	import { page } from '$app/stores';
	import { getRecipeById } from '$lib/stores/recipes';
	import RecipeDetail from '$lib/components/recipe/RecipeDetail.svelte';
	import IngredientCalculator from '$lib/components/recipe/IngredientCalculator.svelte';
	import FermentationSchedule from '$lib/components/recipe/FermentationSchedule.svelte';

	$: recipeId = $page.params.id;
	$: recipe = getRecipeById(recipeId);

	let activeTab: 'ingredients' | 'schedule' = 'ingredients';
</script>

<svelte:head>
	<title>{recipe?.nameDa ?? 'Opskrift'} - Pizza Tool</title>
</svelte:head>

{#if recipe}
	<div class="recipe-page">
		<RecipeDetail {recipe} />

		<div class="tabs">
			<button
				class="tab"
				class:active={activeTab === 'ingredients'}
				on:click={() => (activeTab = 'ingredients')}
			>
				Ingredienser
			</button>
			<button
				class="tab"
				class:active={activeTab === 'schedule'}
				on:click={() => (activeTab = 'schedule')}
			>
				Tidsplan
			</button>
		</div>

		<div class="tab-content">
			{#if activeTab === 'ingredients'}
				<IngredientCalculator {recipe} />
			{:else}
				<FermentationSchedule {recipe} />
			{/if}
		</div>
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

	.tabs {
		display: flex;
		gap: var(--spacing-xs);
		border-bottom: 2px solid var(--color-border);
	}

	.tab {
		flex: 1;
		padding: var(--spacing-sm) var(--spacing-md);
		background: none;
		border: none;
		font-size: var(--font-size-md);
		font-weight: 500;
		color: var(--color-text-secondary);
		cursor: pointer;
		position: relative;
		transition: color 0.2s;
	}

	.tab:hover {
		color: var(--color-text);
	}

	.tab.active {
		color: var(--color-primary);
	}

	.tab.active::after {
		content: '';
		position: absolute;
		bottom: -2px;
		left: 0;
		right: 0;
		height: 2px;
		background: var(--color-primary);
	}

	.tab-content {
		animation: fadeIn 0.2s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
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
