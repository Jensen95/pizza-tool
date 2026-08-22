<script lang="ts">
	import { proofingStyles } from '$lib/utils/proofing-styles';
	import { REFERENCE_ROOM_TEMPERATURE, fermentationRateFactor } from '$lib/utils/fermentation';
	import { formatFullDate, formatHours } from '$lib/utils/format-plan';
	import type { DoughWorkbench } from '$lib/stores/dough-workbench.svelte';

	let { workbench }: { workbench: DoughWorkbench } = $props();

	let rateFactor = $derived(fermentationRateFactor(workbench.roomTemperature));
	let deadlineDriven = $derived(
		workbench.timeMode === 'deadline' && workbench.styleId !== 'custom'
	);
	let readyAt = $derived(workbench.readyAt);
</script>

<section class="section" aria-labelledby="time-heading">
	<div class="section-head">
		<h2 id="time-heading">Hvornår</h2>
		<div class="segmented" role="group" aria-label="Tidsberegning">
			<button
				type="button"
				class="seg"
				class:active={workbench.timeMode === 'duration'}
				aria-pressed={workbench.timeMode === 'duration'}
				onclick={() => (workbench.timeMode = 'duration')}
			>
				Jeg har timer
			</button>
			<button
				type="button"
				class="seg"
				class:active={workbench.timeMode === 'deadline'}
				aria-pressed={workbench.timeMode === 'deadline'}
				onclick={() => (workbench.timeMode = 'deadline')}
			>
				Klar til
			</button>
		</div>
	</div>

	{#if workbench.timeMode === 'deadline'}
		<label class="field">
			<span class="label">Dejen skal være klar</span>
			<input
				class="input"
				type="datetime-local"
				bind:value={workbench.readyAtValue}
				aria-label="Tidspunkt dejen skal være klar"
			/>
		</label>

		{#if readyAt}
			<p class="hint">
				{formatFullDate(readyAt)} — <strong>{formatHours(workbench.availableHours)}</strong> fra nu.
			</p>
		{:else}
			<p class="hint warn">Vælg et tidspunkt for at regne baglæns.</p>
		{/if}
	{/if}

	<div class="styles">
		<span class="label">Hævestil</span>
		<div class="pills" role="group" aria-label="Hævestil">
			{#each proofingStyles as style (style.id)}
				<button
					type="button"
					class="pill"
					class:active={workbench.styleId === style.id}
					aria-pressed={workbench.styleId === style.id}
					title={style.descriptionDa}
					onclick={() => workbench.applyStyle(style.id)}
				>
					{style.nameDa}
				</button>
			{/each}
			<button
				type="button"
				class="pill"
				class:active={workbench.styleId === 'custom'}
				aria-pressed={workbench.styleId === 'custom'}
				onclick={() => workbench.markCustomSplit()}
			>
				Egen fordeling
			</button>
		</div>
		{#if workbench.style}
			<p class="hint">{workbench.style.descriptionDa}</p>
		{/if}
	</div>

	{#if deadlineDriven}
		<div class="split-readout">
			<div class="cell">
				<span class="label">Stuehævning</span>
				<strong>{formatHours(workbench.split.roomHours)}</strong>
			</div>
			<div class="cell">
				<span class="label">Køleskab</span>
				<strong>{formatHours(workbench.split.fridgeHours)}</strong>
			</div>
			<div class="cell">
				<span class="label">Temperering</span>
				<strong>{formatHours(workbench.split.temperHours)}</strong>
			</div>
			{#if workbench.split.predoughHours > 0}
				<div class="cell">
					<span class="label">Fordej</span>
					<strong>{formatHours(workbench.split.predoughHours)}</strong>
				</div>
			{/if}
		</div>

		{#if workbench.styleFit?.tooShort}
			<p class="notice">
				Vinduet er kortere end {workbench.style?.nameDa.toLowerCase()} kræver. Vælg et senere tidspunkt
				eller en hurtigere hævestil.
			</p>
		{:else if (workbench.styleFit?.leftoverHours ?? 0) > 1}
			<p class="notice">
				{formatHours(workbench.styleFit?.leftoverHours ?? 0)} af vinduet bliver ikke brugt — start senere,
				eller vælg en længere hævestil.
			</p>
		{/if}
	{:else}
		<div class="grid-fields">
			<label class="field">
				<span class="label">Ved stuetemperatur</span>
				<div class="with-unit">
					<input
						class="input"
						type="number"
						min="0"
						max="48"
						step="0.5"
						bind:value={workbench.roomHours}
						oninput={() => workbench.markCustomSplit()}
						aria-label="Timer ved stuetemperatur"
					/>
					<span class="unit">timer</span>
				</div>
			</label>

			<label class="field">
				<span class="label">I køleskab</span>
				<div class="with-unit">
					<input
						class="input"
						type="number"
						min="0"
						max="120"
						step="1"
						bind:value={workbench.fridgeHours}
						oninput={() => workbench.markCustomSplit()}
						aria-label="Timer i køleskab"
					/>
					<span class="unit">timer</span>
				</div>
			</label>

			<label class="field">
				<span class="label">Temperering efter køl</span>
				<div class="with-unit">
					<input
						class="input"
						type="number"
						min="0"
						max="12"
						step="0.5"
						bind:value={workbench.temperHours}
						oninput={() => workbench.markCustomSplit()}
						aria-label="Timer til temperering"
					/>
					<span class="unit">timer</span>
				</div>
			</label>
		</div>
	{/if}

	<label class="field">
		<span class="label">Rumtemperatur</span>
		<div class="with-unit">
			<input
				class="input"
				type="number"
				min="10"
				max="35"
				step="1"
				bind:value={workbench.roomTemperature}
				aria-label="Rumtemperatur i celsius"
			/>
			<span class="unit">°C</span>
		</div>
		<p class="hint">
			{#if Math.abs(workbench.roomTemperature - REFERENCE_ROOM_TEMPERATURE) < 0.5}
				Tabellens udgangspunkt. Et varmere køkken hæver hurtigere.
			{:else}
				Dejen hæver ca. <strong>{rateFactor.toFixed(2)}×</strong> så hurtigt som ved
				{REFERENCE_ROOM_TEMPERATURE} °C — gærmængden er justeret efter det.
			{/if}
		</p>
	</label>

	<p class="hint">
		Halvdelen af tempereringen tælles som varm hævetid, fordi dejen er kold, når den kommer ud.
	</p>
</section>

<style>
	.section {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
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

	.styles {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.pills {
		display: flex;
		flex-wrap: wrap;
		gap: var(--spacing-xs);
	}

	.pill {
		min-height: 44px;
		padding: 0 var(--spacing-sm);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-full);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: var(--font-size-sm);
	}

	.pill.active {
		border-color: var(--color-primary);
		color: var(--color-primary);
		background: rgba(var(--color-primary-rgb), 0.06);
		font-weight: 600;
	}

	.split-readout {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
		gap: var(--spacing-xs);
	}

	.cell {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--spacing-xs) var(--spacing-sm);
		background: var(--color-background);
		display: flex;
		flex-direction: column;
	}

	.cell strong {
		font-variant-numeric: tabular-nums;
	}

	.grid-fields {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
		gap: var(--spacing-sm);
	}

	.notice {
		margin: 0;
		padding: var(--spacing-sm);
		border-radius: var(--radius-md);
		background: var(--color-warning-bg);
		border: 1px solid var(--color-warning-border);
		font-size: var(--font-size-sm);
	}

	@media (max-width: 620px) {
		.grid-fields {
			grid-template-columns: 1fr;
		}
	}
</style>
