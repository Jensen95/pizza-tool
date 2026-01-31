<script lang="ts">
	import { sauceRecipes } from '$lib/data/reference';
</script>

<div class="sauce-recipes">
	{#each sauceRecipes as sauce}
		<div class="sauce-card">
			<h4 class="sauce-name">{sauce.nameDa}</h4>
			{#if sauce.descriptionDa}
				<p class="sauce-description">{sauce.descriptionDa}</p>
			{/if}

			<div class="sauce-section">
				<h5 class="section-label">Ingredienser</h5>
				<ul class="ingredient-list">
					{#each sauce.ingredients as ingredient}
						<li>
							<span class="ing-amount">{ingredient.amountDa || ingredient.amount}</span>
							<span class="ing-name">{ingredient.nameDa}</span>
						</li>
					{/each}
				</ul>
			</div>

			<div class="sauce-section">
				<h5 class="section-label">Fremgangsmaade</h5>
				<ol class="instructions-list">
					{#each sauce.instructionsDa as step}
						<li>{step}</li>
					{/each}
				</ol>
			</div>

			{#if sauce.yieldDa}
				<p class="sauce-yield">Raekker til: {sauce.yieldDa}</p>
			{/if}

			{#if sauce.tipsDa && sauce.tipsDa.length > 0}
				<div class="sauce-tips">
					<h5 class="section-label">Tips</h5>
					<ul class="tips-list">
						{#each sauce.tipsDa as tip}
							<li>{tip}</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{/each}
</div>

<style>
	.sauce-recipes {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.sauce-card {
		background: var(--color-background);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
	}

	.sauce-name {
		margin: 0 0 var(--spacing-xs);
		font-size: var(--font-size-lg);
		color: var(--color-primary);
	}

	.sauce-description {
		margin: 0 0 var(--spacing-md);
		color: var(--color-text-secondary);
	}

	.sauce-section {
		margin-bottom: var(--spacing-md);
	}

	.section-label {
		margin: 0 0 var(--spacing-xs);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.ingredient-list,
	.instructions-list,
	.tips-list {
		margin: 0;
		padding-left: var(--spacing-lg);
	}

	.ingredient-list li,
	.instructions-list li,
	.tips-list li {
		margin-bottom: 4px;
	}

	.ing-amount {
		font-weight: 500;
	}

	.sauce-yield {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		font-style: italic;
	}

	.sauce-tips {
		margin-top: var(--spacing-md);
		padding-top: var(--spacing-md);
		border-top: 1px solid var(--color-border);
	}
</style>
