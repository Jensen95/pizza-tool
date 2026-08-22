<script lang="ts">
	import type { FlourCategory, YeastInfo } from '$lib/models';
	import { flourTypeLabels } from '$lib/models';
	import { seedTypes, yeastInfo } from '$lib/data/reference';
	import { formatWeight } from '$lib/utils/baker-percentage';
	import { flourBlendSum, type DoughIngredientRow } from '$lib/utils/dough-ingredients';
	import type { DoughWorkbench } from '$lib/stores/dough-workbench.svelte';

	let { workbench }: { workbench: DoughWorkbench } = $props();

	let blendSum = $derived(flourBlendSum(workbench.flours));

	const extraTypes: { value: DoughIngredientRow['type']; labelDa: string }[] = [
		{ value: 'water', labelDa: 'Vand' },
		{ value: 'seed', labelDa: 'Frø/kerner' },
		{ value: 'salt', labelDa: 'Salt' },
		{ value: 'oil', labelDa: 'Olie' },
		{ value: 'sugar', labelDa: 'Sukker' },
		{ value: 'other', labelDa: 'Andet' }
	];

	const flourCategories = Object.entries(flourTypeLabels) as [FlourCategory, string][];

	function numberValue(event: Event): number {
		return Number((event.currentTarget as HTMLInputElement).value) || 0;
	}
</script>

<section class="section" aria-labelledby="recipe-heading">
	<div class="section-head">
		<h2 id="recipe-heading">Hvad der er i</h2>
		<div class="segmented" role="group" aria-label="Hævemiddel">
			<button
				type="button"
				class="seg"
				class:active={workbench.leavening === 'yeast'}
				aria-pressed={workbench.leavening === 'yeast'}
				onclick={() => (workbench.leavening = 'yeast')}
			>
				Gær
			</button>
			<button
				type="button"
				class="seg"
				class:active={workbench.leavening === 'sourdough'}
				aria-pressed={workbench.leavening === 'sourdough'}
				onclick={() => (workbench.leavening = 'sourdough')}
			>
				Surdej
			</button>
		</div>
	</div>

	<div class="grid-fields">
		<label class="field">
			<span class="label">Hydration</span>
			<div class="with-unit">
				<input
					class="input"
					type="number"
					min="0"
					max="120"
					step="0.5"
					bind:value={workbench.hydrationPercentage}
					aria-label="Hydration i procent"
				/>
				<span class="unit">%</span>
			</div>
		</label>

		<label class="field">
			<span class="label">Salt</span>
			<div class="with-unit">
				<input
					class="input"
					type="number"
					min="0"
					max="5"
					step="0.1"
					bind:value={workbench.saltPercentage}
					aria-label="Salt i procent"
				/>
				<span class="unit">%</span>
			</div>
		</label>

		{#if workbench.leavening === 'yeast'}
			<label class="field">
				<span class="label">Gærtype</span>
				<select
					class="input"
					value={workbench.yeastType}
					aria-label="Gærtype"
					onchange={(event) =>
						workbench.setYeastType(
							(event.currentTarget as HTMLSelectElement).value as YeastInfo['type']
						)}
				>
					{#each yeastInfo as option (option.type)}
						<option value={option.type}>{option.nameDa}</option>
					{/each}
				</select>
			</label>
		{:else}
			<label class="field">
				<span class="label">Surdej</span>
				<div class="with-unit">
					<input
						class="input"
						type="number"
						min="0"
						max="50"
						step="1"
						bind:value={workbench.starterPercentage}
						aria-label="Surdej i procent af mel"
					/>
					<span class="unit">%</span>
				</div>
			</label>
			<label class="field">
				<span class="label">Surdejens hydration</span>
				<div class="with-unit">
					<input
						class="input"
						type="number"
						min="20"
						max="200"
						step="5"
						bind:value={workbench.starterHydrationPercentage}
						aria-label="Surdejens hydration i procent"
					/>
					<span class="unit">%</span>
				</div>
			</label>
		{/if}

		<label class="field">
			<span class="label">Mål-hydration</span>
			<div class="with-unit">
				<input
					class="input"
					type="number"
					min="0"
					max="120"
					step="0.5"
					bind:value={workbench.targetHydrationPercentage}
					aria-label="Mål-hydration i procent"
				/>
				<span class="unit">%</span>
			</div>
			<p class="hint">
				{#if workbench.hydrationDelta === 0}
					Du er på målet.
				{:else if workbench.hydrationDelta > 0}
					{formatWeight(workbench.hydrationDelta)} vand mere for at nå målet.
				{:else}
					{formatWeight(Math.abs(workbench.hydrationDelta))} vand for meget ift. målet.
				{/if}
			</p>
		</label>
	</div>

	<div class="rows">
		<div class="rows-head">
			<h3>Melblanding</h3>
			<button class="btn btn-secondary small" type="button" onclick={() => workbench.addFlour()}>
				+ Tilføj mel
			</button>
		</div>

		{#if workbench.flours.length === 0}
			<p class="hint">
				Én slags stærkt hvidt mel: 100 % af melvægten. Tilføj linjer for at blande — og for at
				fortælle værktøjet om fuldkorn, rug eller spelt.
			</p>
		{:else}
			{#each workbench.flours as row (row.id)}
				<div class="row wide">
					<label class="sr-only" for={`${row.id}-name`}>Navn på mel</label>
					<input
						class="input"
						id={`${row.id}-name`}
						type="text"
						value={row.name}
						oninput={(event) =>
							workbench.updateRow('flours', row.id, {
								name: (event.currentTarget as HTMLInputElement).value
							})}
					/>
					<label class="sr-only" for={`${row.id}-cat`}>Meltype</label>
					<select
						class="input"
						id={`${row.id}-cat`}
						value={row.variant ?? 'tipo-00'}
						onchange={(event) =>
							workbench.updateRow('flours', row.id, {
								variant: (event.currentTarget as HTMLSelectElement).value
							})}
					>
						{#each flourCategories as [value, labelDa] (value)}
							<option {value}>{labelDa}</option>
						{/each}
					</select>
					<div class="with-unit narrow">
						<label class="sr-only" for={`${row.id}-pct`}>Andel i procent</label>
						<input
							class="input"
							id={`${row.id}-pct`}
							type="number"
							min="0"
							max="100"
							step="1"
							value={row.percentage}
							oninput={(event) =>
								workbench.updateRow('flours', row.id, { percentage: numberValue(event) })}
						/>
						<span class="unit">%</span>
					</div>
					<button
						class="remove"
						type="button"
						aria-label={`Fjern ${row.name}`}
						onclick={() => workbench.removeRow('flours', row.id)}
					>
						✕
					</button>
				</div>
			{/each}
			<p class="hint" class:warn={Math.abs(blendSum - 100) > 0.5}>
				Melblandingen summer til {blendSum.toFixed(1)} %
				{#if Math.abs(blendSum - 100) > 0.5}
					— den skal ramme 100 %.
				{/if}
			</p>
		{/if}
	</div>

	<div class="rows">
		<div class="rows-head">
			<h3>Øvrige ingredienser</h3>
			<div class="row-actions">
				<button
					class="btn btn-secondary small"
					type="button"
					onclick={() => workbench.addExtra('water')}
				>
					+ Vandlinje
				</button>
				<button
					class="btn btn-secondary small"
					type="button"
					onclick={() => workbench.addExtra('seed')}
				>
					+ Frø/kerner
				</button>
				<button
					class="btn btn-secondary small"
					type="button"
					onclick={() => workbench.addExtra('other')}
				>
					+ Ingrediens
				</button>
			</div>
		</div>

		{#if workbench.extras.length === 0}
			<p class="hint">
				Tilføj frø og kerner, malt, honning, olie — eller en vandlinje, hvis vandet skal deles op i
				autolyse og bassinage.
			</p>
		{:else}
			{#each workbench.extras as row (row.id)}
				<div class="row wide">
					<label class="sr-only" for={`${row.id}-ename`}>Navn</label>
					<input
						class="input"
						id={`${row.id}-ename`}
						type="text"
						value={row.name}
						oninput={(event) =>
							workbench.updateRow('extras', row.id, {
								name: (event.currentTarget as HTMLInputElement).value
							})}
					/>
					<label class="sr-only" for={`${row.id}-etype`}>Type</label>
					<select
						class="input"
						id={`${row.id}-etype`}
						value={row.type}
						onchange={(event) =>
							workbench.updateRow('extras', row.id, {
								type: (event.currentTarget as HTMLSelectElement).value as DoughIngredientRow['type']
							})}
					>
						{#each extraTypes as option (option.value)}
							<option value={option.value}>{option.labelDa}</option>
						{/each}
					</select>
					{#if row.type === 'seed'}
						<label class="sr-only" for={`${row.id}-seed`}>Slags frø</label>
						<select
							class="input"
							id={`${row.id}-seed`}
							value={row.variant ?? 'other'}
							onchange={(event) =>
								workbench.updateRow('extras', row.id, {
									variant: (event.currentTarget as HTMLSelectElement).value,
									name:
										seedTypes.find(
											(seed) => seed.id === (event.currentTarget as HTMLSelectElement).value
										)?.nameDa ?? row.name
								})}
						>
							{#each seedTypes as seed (seed.id)}
								<option value={seed.id}>{seed.nameDa}</option>
							{/each}
						</select>
					{/if}
					<div class="with-unit narrow">
						<label class="sr-only" for={`${row.id}-epct`}>Procent af mel</label>
						<input
							class="input"
							id={`${row.id}-epct`}
							type="number"
							min="0"
							step="0.1"
							value={row.percentage}
							oninput={(event) =>
								workbench.updateRow('extras', row.id, { percentage: numberValue(event) })}
						/>
						<span class="unit">%</span>
					</div>
					<button
						class="remove"
						type="button"
						aria-label={`Fjern ${row.name}`}
						onclick={() => workbench.removeRow('extras', row.id)}
					>
						✕
					</button>
				</div>
			{/each}
			<p class="hint">
				Vandlinjer tager deres del af hydrationen — de lægger ikke vand oveni. Alt andet lægges
				oveni dejen.
			</p>
		{/if}
	</div>
</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.section-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-sm);
		flex-wrap: wrap;
	}

	.section-head h2 {
		font-size: var(--font-size-lg);
		margin: 0;
	}

	.segmented {
		display: inline-flex;
		gap: 2px;
		padding: 3px;
		background: var(--color-background);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
	}

	.seg {
		min-height: 36px;
		padding: 0 var(--spacing-md);
		border-radius: var(--radius-full);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.seg.active {
		background: var(--color-primary);
		color: var(--color-text-light);
	}

	.grid-fields {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--spacing-sm);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.with-unit {
		display: grid;
		grid-template-columns: 1fr auto;
		align-items: center;
	}

	.with-unit.narrow {
		width: 8rem;
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

	.hint.warn {
		color: var(--color-error);
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.rows-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-sm);
		flex-wrap: wrap;
	}

	.rows-head h3 {
		font-size: var(--font-size-md);
		margin: 0;
	}

	.row-actions {
		display: flex;
		gap: var(--spacing-xs);
	}

	.small {
		min-height: 36px;
		padding: 0 var(--spacing-sm);
		font-size: var(--font-size-xs);
	}

	.row {
		display: flex;
		gap: var(--spacing-xs);
		align-items: center;
	}

	.row .input[type='text'] {
		flex: 1;
		min-width: 0;
	}

	.row select.input {
		width: 7rem;
	}

	.remove {
		width: 44px;
		height: 44px;
		flex: 0 0 44px;
		border-radius: var(--radius-full);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text-secondary);
	}

	.remove:hover {
		color: var(--color-error);
	}

	@media (max-width: 620px) {
		.grid-fields {
			grid-template-columns: 1fr;
		}

		.row.wide {
			flex-wrap: wrap;
		}

		.row.wide select.input {
			width: auto;
			flex: 1;
		}
	}
</style>
