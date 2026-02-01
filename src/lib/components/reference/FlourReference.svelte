<script lang="ts">
	import { flourTypes } from '$lib/data/reference';
	import { flourTypeLabels } from '$lib/types';

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
</style>
