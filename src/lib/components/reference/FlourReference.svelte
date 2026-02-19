<!-- ABOUTME: Flour types cards + hydration-by-style, W-strength, protein-to-W reference tables -->
<script lang="ts">
	import { flourTypes, flourReference } from '$lib/data/reference';
	import { flourTypeLabels } from '$lib/models';

	let sortedFlours = $derived([...flourTypes].sort((a, b) => a.proteinMin - b.proteinMin));
</script>

<div class="flour-reference">
	<p class="intro">
		Oversigt over meltyper og deres egenskaber. Vælg mel baseret på fermentationstid og ønsket
		resultat.
	</p>

	<div class="flour-grid">
		{#each sortedFlours as flour}
			<div class="flour-card">
				<h4 class="flour-name">{flour.nameDa}</h4>
				<div class="flour-details">
					<div class="detail-row">
						<span class="detail-label">Type:</span>
						<span class="detail-value">{flourTypeLabels[flour.type]}</span>
					</div>
					<div class="detail-row">
						<span class="detail-label">Protein:</span>
						<span class="detail-value">
							{flour.proteinMin === flour.proteinMax
								? `${flour.proteinMin}%`
								: `${flour.proteinMin}-${flour.proteinMax}%`}
						</span>
					</div>
					{#if flour.wValue || flour.wValueMin}
						<div class="detail-row">
							<span class="detail-label">W-værdi:</span>
							<span class="detail-value">
								{flour.wValue || `${flour.wValueMin}-${flour.wValueMax}`}
							</span>
						</div>
					{/if}
					{#if flour.notesDa}
						<div class="detail-row notes">
							<span class="detail-label">Fermentering:</span>
							<span class="detail-value">{flour.notesDa}</span>
						</div>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<h3 class="section-heading">Hydrering efter stil</h3>
	<div class="table-wrapper">
		<table class="ref-table">
			<thead>
				<tr>
					<th>Stil</th>
					<th>Hydrering</th>
				</tr>
			</thead>
			<tbody>
				{#each flourReference.hydrationByStyle as row}
					<tr>
						<td>{row.styleDa}</td>
						<td>{row.hydrationMin}-{row.hydrationMax}%</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<h3 class="section-heading">W-styrke klassifikation</h3>
	<div class="table-wrapper">
		<table class="ref-table">
			<thead>
				<tr>
					<th>Kategori</th>
					<th>W-værdi</th>
					<th>Protein</th>
					<th>Anvendelse</th>
				</tr>
			</thead>
			<tbody>
				{#each flourReference.wStrengthTiers as tier}
					<tr>
						<td>{tier.tierDa}</td>
						<td>{tier.wMin}-{tier.wMax}</td>
						<td>{tier.proteinMin}-{tier.proteinMax}%</td>
						<td>{tier.useDa}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<h3 class="section-heading">Protein → W-værdi</h3>
	<div class="table-wrapper">
		<table class="ref-table">
			<thead>
				<tr>
					<th>Protein</th>
					<th>W-værdi</th>
				</tr>
			</thead>
			<tbody>
				{#each flourReference.proteinToW as row}
					<tr>
						<td>{row.proteinMin}-{row.proteinMax}%</td>
						<td>{row.wMin}-{row.wMax}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.flour-reference {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.intro {
		color: var(--color-text-secondary);
		margin: 0;
	}

	.flour-grid {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.flour-card {
		background: var(--color-background);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
	}

	.flour-name {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--font-size-md);
		color: var(--color-primary);
	}

	.flour-details {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.detail-row {
		display: flex;
		gap: var(--spacing-sm);
		font-size: var(--font-size-sm);
	}

	.detail-row.notes {
		flex-direction: column;
		gap: 2px;
	}

	.detail-label {
		color: var(--color-text-secondary);
		min-width: 80px;
	}

	.detail-value {
		color: var(--color-text);
	}

	.section-heading {
		margin: var(--spacing-md) 0 0;
		font-size: var(--font-size-md);
		color: var(--color-primary);
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
</style>
