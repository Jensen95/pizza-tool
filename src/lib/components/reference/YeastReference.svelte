<!-- ABOUTME: Yeast types cards, lookup table (time/temp → IDY%), and brand conversions -->
<script lang="ts">
	import { yeastInfo, yeastLookup } from '$lib/data/reference';
</script>

<div class="yeast-reference">
	<h3 class="section-heading">Gærtyper</h3>
	<div class="yeast-grid">
		{#each yeastInfo as yeast}
			<div class="yeast-card">
				<h4 class="yeast-name">{yeast.nameDa}</h4>
				<div class="yeast-details">
					<div class="detail-row">
						<span class="detail-label">Konvertering:</span>
						<span class="detail-value">×{yeast.conversionFactor} (ift. frisk gær)</span>
					</div>
					{#if yeast.storageTempDa}
						<div class="detail-row">
							<span class="detail-label">Opbevaring:</span>
							<span class="detail-value">{yeast.storageTempDa}</span>
						</div>
					{/if}
					{#if yeast.shelfLifeDa}
						<div class="detail-row">
							<span class="detail-label">Holdbarhed:</span>
							<span class="detail-value">{yeast.shelfLifeDa}</span>
						</div>
					{/if}
					{#if yeast.notesDa}
						<p class="yeast-note">{yeast.notesDa}</p>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<h3 class="section-heading">Gær opslagstabel</h3>
	<p class="table-intro">
		IDY-procent (instant tørgær) af melvægt baseret på hævetid og placering.
	</p>
	<div class="table-wrapper">
		<table class="ref-table">
			<thead>
				<tr>
					<th>Placering</th>
					<th>Timer</th>
					<th>IDY %</th>
				</tr>
			</thead>
			<tbody>
				{#each yeastLookup.lookupTable as entry}
					<tr>
						<td>{entry.location === 'room' ? 'Stuetemperatur' : 'Køleskab'}</td>
						<td>{entry.hours}t</td>
						<td>{entry.idyPercentage}%</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<h3 class="section-heading">Mærkekonvertering</h3>
	<div class="table-wrapper">
		<table class="ref-table">
			<thead>
				<tr>
					<th>Mærke</th>
					<th>Type</th>
					<th>Ratio (frisk:tør)</th>
					<th>Note</th>
				</tr>
			</thead>
			<tbody>
				{#each yeastLookup.brandConversions as brand}
					<tr>
						<td>{brand.brand}</td>
						<td>{brand.type === 'instant' ? 'Instant' : 'Aktiv tør'}</td>
						<td>{brand.ratio}</td>
						<td>{brand.note || '—'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<style>
	.yeast-reference {
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

	.yeast-grid {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.yeast-card {
		background: var(--color-background);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
	}

	.yeast-name {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--font-size-md);
		color: var(--color-primary);
	}

	.yeast-details {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.detail-row {
		display: flex;
		gap: var(--spacing-sm);
		font-size: var(--font-size-sm);
	}

	.detail-label {
		color: var(--color-text-secondary);
		min-width: 100px;
	}

	.detail-value {
		color: var(--color-text);
	}

	.yeast-note {
		margin: var(--spacing-xs) 0 0;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		font-style: italic;
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
</style>
