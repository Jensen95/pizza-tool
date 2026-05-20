<script lang="ts">
	import type { BakerMathIngredient } from '$lib/utils/baker-math.types';
	import {
		calculateHydrationPercentage,
		calculateTargetWater,
		summarizeBakerMath
	} from '$lib/utils/baker-math';
	import { formatWeight } from '$lib/utils/baker-percentage';

	const defaultIngredients: BakerMathIngredient[] = [
		{ id: 'water', name: 'Vand', percentage: 65, type: 'water' },
		{ id: 'salt', name: 'Salt', percentage: 2.8, type: 'other' },
		{ id: 'oil', name: 'Olivenolie', percentage: 2, type: 'other' }
	];

	let flourWeight = $state(1000);
	let targetHydration = $state(65);
	let ingredients = $state<BakerMathIngredient[]>([...defaultIngredients]);

	let summary = $derived(summarizeBakerMath(flourWeight, ingredients));
	let targetWater = $derived(calculateTargetWater(flourWeight, targetHydration));
	let hydrationDelta = $derived(
		Math.round((targetWater.waterWeight - summary.waterWeight + Number.EPSILON) * 100) / 100
	);
	let totalPercentage = $derived(
		summary.ingredients.reduce((sum, ingredient) => sum + ingredient.percentage, 0)
	);
	let waterPercentage = $derived(calculateHydrationPercentage(ingredients));

	function updateIngredient(
		id: string,
		field: 'name' | 'percentage' | 'type',
		value: string | number
	) {
		ingredients = ingredients.map((ingredient) => {
			if (ingredient.id !== id) return ingredient;
			if (field === 'percentage') {
				return { ...ingredient, percentage: Math.max(0, Number(value) || 0) };
			}
			if (field === 'type') {
				return { ...ingredient, type: value as BakerMathIngredient['type'] };
			}
			return { ...ingredient, name: String(value) };
		});
	}

	function addIngredient() {
		const id =
			typeof crypto !== 'undefined' && crypto.randomUUID
				? crypto.randomUUID()
				: `ingredient-${Date.now()}`;
		ingredients = [
			...ingredients,
			{ id, name: 'Ny ingrediens', percentage: 0, type: 'other' as const }
		];
	}

	function removeIngredient(id: string) {
		ingredients = ingredients.filter((ingredient) => ingredient.id !== id);
	}
</script>

<div class="tool-card" data-testid="baker-math-lab">
	<div class="card-header">
		<div>
			<p class="eyebrow">Bager-matematik</p>
			<h2>Byg din dej efter procenter</h2>
			<p class="muted">
				Start med melvægten og tilføj ingredienser efter bagerprocent. Hydration beregnes automatisk
				og du ser straks total dejvægt.
			</p>
		</div>
	</div>

	<div class="controls">
		<label class="field">
			<span class="label">Mel</span>
			<div class="input-with-unit">
				<input
					class="input"
					type="number"
					min="0"
					step="10"
					bind:value={flourWeight}
					aria-label="Mel i gram"
				/>
				<span class="unit">g</span>
			</div>
		</label>

		<label class="field">
			<span class="label">Mål-hydration</span>
			<div class="input-with-unit">
				<input
					class="input"
					type="number"
					min="0"
					step="0.5"
					bind:value={targetHydration}
					aria-label="Ønsket hydration i procent"
				/>
				<span class="unit">%</span>
			</div>
			<p class="hint">Bruges til at se foreslået vandmængde</p>
		</label>
	</div>

	<div class="stats-grid">
		<div class="stat-card">
			<div class="muted">Nuværende hydration</div>
			<div class="stat-value">
				{waterPercentage.toFixed(1)}%
				<span class="badge secondary">{formatWeight(summary.waterWeight)}</span>
			</div>
		</div>
		<div class="stat-card">
			<div class="muted">Total dejvægt</div>
			<div class="stat-value">
				{formatWeight(summary.totalDoughWeight)}
				<span class="subtext">{totalPercentage.toFixed(1)}% ingredienser</span>
			</div>
		</div>
		<div class="stat-card">
			<div class="muted">Mod mål-hydration</div>
			<div class="stat-value">
				{formatWeight(targetWater.waterWeight)}
				<span class:positive={hydrationDelta > 0} class:negative={hydrationDelta < 0}>
					{hydrationDelta === 0 ? 'klar' : `${hydrationDelta > 0 ? '+' : ''}${hydrationDelta} g`}
				</span>
			</div>
			<p class="hint">Forslag ift. {targetHydration}% hydration</p>
		</div>
	</div>

	<div class="ingredients">
		<div class="ingredients-header">
			<h3>Ingrediensliste</h3>
			<button class="btn btn-secondary" type="button" onclick={addIngredient}>
				+ Tilføj ingrediens
			</button>
		</div>

		<div class="ingredient-grid">
			{#each summary.ingredients as ingredient}
				<div class="ingredient-row">
					<div class="stack">
						<label class="label" for={`${ingredient.id}-name`}>Navn</label>
						<input
							class="input"
							type="text"
							id={`${ingredient.id}-name`}
							value={ingredient.name}
							oninput={(event) =>
								updateIngredient(
									ingredient.id,
									'name',
									(event.currentTarget as HTMLInputElement).value
								)}
						/>
					</div>

					<div class="stack">
						<label class="label" for={`${ingredient.id}-type`}>Type</label>
						<select
							class="input"
							id={`${ingredient.id}-type`}
							value={ingredient.type}
							onchange={(event) =>
								updateIngredient(
									ingredient.id,
									'type',
									(event.currentTarget as HTMLSelectElement).value
								)}
						>
							<option value="water">Vand</option>
							<option value="other">Andet</option>
						</select>
					</div>

					<div class="stack">
						<label class="label" for={`${ingredient.id}-percentage`}>Procent af mel</label>
						<div class="input-with-unit">
							<input
								class="input"
								type="number"
								min="0"
								step="0.1"
								id={`${ingredient.id}-percentage`}
								value={ingredient.percentage}
								oninput={(event) =>
									updateIngredient(
										ingredient.id,
										'percentage',
										(event.currentTarget as HTMLInputElement).value
									)}
							/>
							<span class="unit">%</span>
						</div>
					</div>

					<div class="stack">
						<div class="label">Vægt</div>
						<div class="weight-readout">{formatWeight(ingredient.weight)}</div>
					</div>

					<button
						class="remove"
						type="button"
						aria-label={`Fjern ${ingredient.name}`}
						onclick={() => removeIngredient(ingredient.id)}
					>
						✕
					</button>
				</div>
			{/each}
		</div>
	</div>

	<div class="footnote">
		<p class="muted">
			Hydration beregnes kun ud fra ingredienser markeret som vand. Brug flere vand-linjer til
			f.eks. for- eller autolyse.
		</p>
	</div>
</div>

<style>
	.tool-card {
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		padding: var(--spacing-lg);
		box-shadow: var(--shadow-sm);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.card-header h2 {
		margin: 4px 0 8px;
	}

	.eyebrow {
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-size: var(--font-size-xs);
		color: var(--color-primary);
		font-weight: 700;
		margin: 0;
	}

	.muted {
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.controls {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--spacing-md);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.input-with-unit {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
	}

	.unit {
		padding: 0 var(--spacing-sm);
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.hint {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-xs);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--spacing-sm);
	}

	.stat-card {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		background: var(--color-background);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.stat-value {
		font-weight: 700;
		display: flex;
		align-items: baseline;
		gap: var(--spacing-xs);
	}

	.badge {
		background: var(--color-primary);
		color: var(--color-text-light);
		padding: 2px 8px;
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
	}

	.badge.secondary {
		background: var(--color-border);
		color: var(--color-text);
	}

	.subtext {
		color: var(--color-text-secondary);
		font-size: var(--font-size-xs);
		font-weight: 500;
	}

	.stats-grid span {
		font-size: var(--font-size-sm);
	}

	.stats-grid span.positive {
		color: var(--color-success);
	}

	.stats-grid span.negative {
		color: var(--color-error);
	}

	.ingredients {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.ingredients-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.ingredient-grid {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.ingredient-row {
		display: grid;
		grid-template-columns: 2fr 1fr 1fr 1fr auto;
		gap: var(--spacing-sm);
		align-items: end;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--spacing-sm);
		background: var(--color-background);
	}

	.stack {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.weight-readout {
		font-weight: 600;
		color: var(--color-primary);
	}

	.remove {
		align-self: center;
		width: 44px;
		height: 44px;
		border-radius: var(--radius-full);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text-secondary);
	}

	.remove:hover {
		color: var(--color-error);
	}

	.footnote {
		border-top: 1px solid var(--color-border);
		padding-top: var(--spacing-sm);
	}

	@media (max-width: 900px) {
		.stats-grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 720px) {
		.controls {
			grid-template-columns: 1fr;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}

		.ingredient-row {
			grid-template-columns: 1fr;
		}

		.ingredients-header {
			flex-direction: column;
			align-items: flex-start;
			gap: var(--spacing-xs);
		}
	}
</style>
