<!-- ABOUTME: Pizza sizes table, deep pan formulas, and topping amounts per cm diameter -->
<script lang="ts">
	import { pizzaSizes, toppingAmounts } from '$lib/data/reference';

	const toppingLabels: Record<string, string> = {
		sauceGramsPerCm: 'Sauce',
		cheeseGramsPerCm: 'Ost',
		meatGramsPerCm: 'Kød',
		vegetablesGramsPerCm: 'Grøntsager',
		otherGramsPerCm: 'Andet'
	};

	let toppingKeys = $derived(
		Object.keys(
			toppingAmounts.perCmDiameter.nonNeapolitan
		) as (keyof typeof toppingAmounts.perCmDiameter.nonNeapolitan)[]
	);
</script>

<div class="size-guide">
	<h3 class="section-heading">Pizzastørrelser</h3>
	<div class="table-wrapper">
		<table class="ref-table">
			<thead>
				<tr>
					<th>Størrelse</th>
					<th>Napolitansk</th>
					<th>NY-style</th>
					<th>Diameter</th>
					<th>Stykker</th>
					<th>Personer</th>
				</tr>
			</thead>
			<tbody>
				{#each pizzaSizes.sizes as size}
					<tr>
						<td>{size.labelDa}</td>
						<td>{size.neapolitanGrams}g</td>
						<td>{size.nyStyleGrams}g</td>
						<td>{size.diameter}</td>
						<td>{size.slices}</td>
						<td>{size.persons}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<h3 class="section-heading">Bradepande formler</h3>
	<div class="formula-cards">
		<div class="formula-card">
			<h4 class="formula-label">Rektangulær</h4>
			<p class="formula-text">{pizzaSizes.deepPanFormulas.rectangleDa}</p>
		</div>
		<div class="formula-card">
			<h4 class="formula-label">Rund</h4>
			<p class="formula-text">{pizzaSizes.deepPanFormulas.roundDa}</p>
		</div>
	</div>

	<h3 class="section-heading">Topping mængder</h3>
	<p class="table-intro">{toppingAmounts.notesDa}</p>
	<div class="table-wrapper">
		<table class="ref-table">
			<thead>
				<tr>
					<th>Kategori</th>
					<th>Standard (g/cm)</th>
					<th>Napolitansk (g/cm)</th>
				</tr>
			</thead>
			<tbody>
				{#each toppingKeys as key}
					<tr>
						<td>{toppingLabels[key]}</td>
						<td>{toppingAmounts.perCmDiameter.nonNeapolitan[key]}</td>
						<td>{toppingAmounts.perCmDiameter.neapolitan[key]}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.size-guide {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.section-heading {
		margin: var(--spacing-md) 0 0;
		font-size: var(--font-size-md);
		color: var(--color-primary);
	}

	.section-heading:first-child {
		margin-top: 0;
	}

	.table-intro {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.table-wrapper {
		overflow-x: auto;
	}

	.ref-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--font-size-sm);
		background: var(--color-background);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.ref-table th,
	.ref-table td {
		padding: var(--spacing-sm) var(--spacing-md);
		text-align: left;
		border-bottom: 1px solid var(--color-border);
	}

	.ref-table th {
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
		font-size: var(--font-size-xs, 0.75rem);
	}

	.ref-table td {
		color: var(--color-text);
	}

	.ref-table tbody tr:last-child td {
		border-bottom: none;
	}

	.formula-cards {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.formula-card {
		background: var(--color-background);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
	}

	.formula-label {
		margin: 0 0 var(--spacing-xs);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text-secondary);
	}

	.formula-text {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--color-text);
		font-family: monospace;
	}
</style>
