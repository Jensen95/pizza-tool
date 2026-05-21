<script lang="ts">
	import type { YeastInfo } from '$lib/models';
	import { yeastInfo } from '$lib/data/reference';
	import { convertYeastPercentage } from '$lib/utils/yeast';

	const yeastOptions = yeastInfo;

	let amount = $state(2);
	let fromType = $state<YeastInfo['type']>('fresh');
	let toType = $state<YeastInfo['type']>('instant');

	let fromInfo = $derived(yeastOptions.find((info) => info.type === fromType));
	let toInfo = $derived(yeastOptions.find((info) => info.type === toType));

	let convertedAmount = $derived(
		Math.round(convertYeastPercentage(amount, fromType, toType) * 100) / 100
	);
	let conversionRatio = $derived(
		Math.round(convertYeastPercentage(1, fromType, toType) * 1000) / 1000
	);

	function swapTypes() {
		const current = fromType;
		fromType = toType;
		toType = current;
	}
</script>

<div class="tool-card" data-testid="yeast-converter">
	<div class="card-header">
		<div>
			<p class="eyebrow">Gær-konvertering</p>
			<h2>Byt gærtype uden at ændre dejen</h2>
			<p class="muted">
				Konverter mellem frisk, tør og instant gær. Indtast gærmængden i gram og se den tilsvarende
				mængde for en anden gærtype.
			</p>
		</div>
	</div>

	<div class="input-grid">
		<label class="field">
			<span class="label">Gærmængde</span>
			<div class="input-with-unit">
				<input
					class="input"
					type="number"
					min="0"
					step="0.1"
					bind:value={amount}
					aria-label="Gærmængde i gram"
				/>
				<span class="unit">g</span>
			</div>
		</label>

		<label class="field">
			<span class="label">Fra</span>
			<select class="input" bind:value={fromType} aria-label="Fra gærtype">
				{#each yeastOptions as option}
					<option value={option.type}>{option.name}</option>
				{/each}
			</select>
		</label>

		<button class="swap" type="button" aria-label="Byt gærtyper" onclick={swapTypes}> ↔ </button>

		<label class="field">
			<span class="label">Til</span>
			<select class="input" bind:value={toType} aria-label="Til gærtype">
				{#each yeastOptions as option}
					<option value={option.type}>{option.name}</option>
				{/each}
			</select>
		</label>
	</div>

	<div class="results">
		<div class="highlight">
			<div class="muted">Konverteret mængde</div>
			<div class="result-value">
				{convertedAmount}
				<span class="unit">g</span>
			</div>
		</div>

		<div class="grid-2 stats">
			<div class="stat">
				<div class="muted">Udgangspunkt</div>
				<div class="stat-value">
					{fromInfo?.name ?? fromType}
				</div>
			</div>
			<div class="stat">
				<div class="muted">Mål</div>
				<div class="stat-value">
					{toInfo?.name ?? toType}
					<span class="badge">x{conversionRatio}</span>
				</div>
			</div>
		</div>

		{#if toInfo?.notesDa}
			<p class="tip">
				Tip: {toInfo.notesDa}
			</p>
		{/if}
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

	.input-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--spacing-sm);
		align-items: end;
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

	.swap {
		align-self: center;
		justify-self: center;
		width: 44px;
		height: 44px;
		border-radius: var(--radius-full);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		font-size: var(--font-size-lg);
		color: var(--color-primary);
	}

	.swap:hover {
		background: rgba(var(--color-primary-rgb), 0.08);
	}

	.results {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.highlight {
		background: var(--color-warning-bg, rgba(var(--color-primary-rgb), 0.06));
		border: 1px solid var(--color-primary-light);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
	}

	.result-value {
		font-size: var(--font-size-2xl);
		font-weight: 700;
		display: flex;
		align-items: baseline;
		gap: var(--spacing-xs);
	}

	.stats {
		display: grid;
		gap: var(--spacing-sm);
	}

	.stat {
		background: var(--color-background);
		padding: var(--spacing-sm);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
	}

	.stat-value {
		font-weight: 600;
		display: flex;
		gap: var(--spacing-xs);
		align-items: center;
	}

	.badge {
		background: var(--color-primary);
		color: var(--color-text-light);
		padding: 2px 8px;
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
	}

	.tip {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	@media (max-width: 720px) {
		.input-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.swap {
			grid-column: span 2;
			width: 100%;
		}
	}
</style>
