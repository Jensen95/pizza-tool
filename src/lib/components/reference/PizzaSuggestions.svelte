<script lang="ts">
	import pizzaSuggestions from '$lib/data/reference/pizza-suggestions.json';

	let expandedIndex = $state<number | null>(null);

	function toggleExpand(index: number) {
		expandedIndex = expandedIndex === index ? null : index;
	}
</script>

<div class="pizza-suggestions">
	<p class="intro">Klassiske italienske pizzaer og andre lækre varianter til inspiration.</p>

	<div class="pizza-list">
		{#each pizzaSuggestions as pizza, index}
			<div class="pizza-card" class:expanded={expandedIndex === index}>
				<button class="pizza-header" onclick={() => toggleExpand(index)}>
					<h3 class="pizza-name">{pizza.name}</h3>
					<span class="toggle-icon">{expandedIndex === index ? '−' : '+'}</span>
				</button>

				{#if expandedIndex === index}
					<div class="pizza-details">
						<div class="ingredients-section">
							<h4>Ingredienser</h4>
							<ul class="ingredients-list">
								{#each pizza.ingredients as ingredient}
									<li>{ingredient}</li>
								{/each}
							</ul>
						</div>

						<div class="instructions-section">
							<h4>Fremgangsmåde</h4>
							<p>{pizza.instructions}</p>
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.pizza-suggestions {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.intro {
		color: var(--color-text-secondary);
		margin: 0;
	}

	.pizza-list {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.pizza-card {
		background: var(--color-surface);
		border-radius: var(--radius-md);
		overflow: hidden;
		border: 1px solid var(--color-border);
	}

	.pizza-card.expanded {
		border-color: var(--color-primary);
	}

	.pizza-header {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--spacing-md);
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
	}

	.pizza-name {
		margin: 0;
		font-size: var(--font-size-md);
		font-weight: 600;
		color: var(--color-text);
	}

	.toggle-icon {
		font-size: var(--font-size-lg);
		color: var(--color-text-secondary);
		font-weight: 300;
	}

	.pizza-details {
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		border-top: 1px solid var(--color-border);
		animation: slideDown 0.2s ease-out;
	}

	@keyframes slideDown {
		from {
			opacity: 0;
			transform: translateY(-8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.ingredients-section h4,
	.instructions-section h4 {
		margin: 0 0 var(--spacing-xs);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.ingredients-list {
		margin: 0;
		padding-left: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.ingredients-list li {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.instructions-section p {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.5;
	}
</style>
