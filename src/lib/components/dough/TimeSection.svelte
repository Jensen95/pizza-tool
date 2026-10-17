<script lang="ts">
	import { proofingStyles } from '$lib/utils/proofing-styles';
	import {
		MAX_DOUGH_TEMPERATURE,
		MIN_DOUGH_TEMPERATURE,
		REFERENCE_ROOM_TEMPERATURE,
		TARGET_DOUGH_TEMPERATURE,
		fermentationRateFactor
	} from '$lib/utils/fermentation';
	import { formatFullDate, formatHours } from '$lib/utils/format-plan';
	import type { DoughWorkbench } from '$lib/stores/dough-workbench.svelte';

	let { workbench }: { workbench: DoughWorkbench } = $props();

	let rateFactor = $derived(fermentationRateFactor(workbench.roomTemperature));

	// A cleared field binds null, and a half-typed "2" is 2 °C: neither is a dough
	// temperature, so no percentage is computed from them. Outside 10-35 °C the
	// rate model is clamped and would show a saturated, wrong figure.
	let doughTemperature = $derived(
		typeof workbench.doughTemperature === 'number' && Number.isFinite(workbench.doughTemperature)
			? workbench.doughTemperature
			: null
	);
	let outsideModel = $derived(
		doughTemperature !== null &&
			(doughTemperature < MIN_DOUGH_TEMPERATURE || doughTemperature > MAX_DOUGH_TEMPERATURE)
	);
	let isYeast = $derived(workbench.leavening === 'yeast');

	// How far the dough's own speed is from the edge of the target band, so the
	// tip can say what being off target actually costs.
	let fasterThanTarget = $derived(
		Math.round(
			(fermentationRateFactor(doughTemperature ?? TARGET_DOUGH_TEMPERATURE.max) /
				fermentationRateFactor(TARGET_DOUGH_TEMPERATURE.max) -
				1) *
				100
		)
	);
	let slowerThanTarget = $derived(
		Math.round(
			(1 -
				fermentationRateFactor(doughTemperature ?? TARGET_DOUGH_TEMPERATURE.min) /
					fermentationRateFactor(TARGET_DOUGH_TEMPERATURE.min)) *
				100
		)
	);
	let lotsOfWholegrain = $derived(workbench.strength.wholegrainPercentage > 35);
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

	<div class="autolyse">
		<label class="toggle">
			<input type="checkbox" bind:checked={workbench.autolyseEnabled} aria-label="Brug autolyse" />
			<span>Autolyse</span>
		</label>

		{#if workbench.autolyseEnabled}
			<label class="field inline">
				<span class="label">Hviletid</span>
				<div class="with-unit">
					<input
						class="input"
						type="number"
						min="0.25"
						max="6"
						step="0.25"
						bind:value={workbench.autolyseHours}
						aria-label="Autolyse i timer"
					/>
					<span class="unit">timer</span>
				</div>
			</label>
		{/if}
	</div>

	{#if workbench.autolyseEnabled}
		<p class="hint">
			Mel og {workbench.holdBackShare > 0
				? workbench.holdBackShare < 0.5
					? 'det meste af vandet'
					: 'en del af vandet'
				: 'vand'} blandes først og hviler {formatHours(workbench.autolyseHours)}; salt og
			{workbench.leavening === 'sourdough' ? 'surdej' : 'gær'} kommer i bagefter. Mængderne er de samme
			— autolysen bruger af tiden, men ikke af gærbudgettet, for der er ingen gær i dejen endnu.
		</p>
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
		<span class="label">Dejtemperatur efter æltning</span>
		<div class="with-unit">
			<input
				class="input"
				type="number"
				min="10"
				max="35"
				step="0.5"
				bind:value={workbench.doughTemperature}
				aria-label="Dejtemperatur efter æltning i celsius"
			/>
			<span class="unit">°C</span>
		</div>
		<p
			class="hint"
			class:warn={doughTemperature !== null && doughTemperature > TARGET_DOUGH_TEMPERATURE.max}
		>
			{#if doughTemperature === null}
				Mål dejen med et stegetermometer lige efter æltning, og skriv temperaturen her.
			{:else if outsideModel}
				{doughTemperature} °C ligger uden for det, værktøjet regner med ({MIN_DOUGH_TEMPERATURE}-{MAX_DOUGH_TEMPERATURE}
				°C). Mål igen — et stegetermometer skal sidde midt i dejen.
			{:else if doughTemperature > TARGET_DOUGH_TEMPERATURE.max}
				{#if fasterThanTarget < 1}
					Lige over målet på {TARGET_DOUGH_TEMPERATURE.min}-{TARGET_DOUGH_TEMPERATURE.max} °C. Hold øje
					med dejen mod slutningen.
				{:else}
					Over målet på {TARGET_DOUGH_TEMPERATURE.min}-{TARGET_DOUGH_TEMPERATURE.max} °C — dejen hæver
					ca. <strong>{fasterThanTarget} % hurtigere</strong> end ved {TARGET_DOUGH_TEMPERATURE.max} °C.
					Brug koldere vand, eller ælt kortere.
				{/if}
			{:else if doughTemperature < TARGET_DOUGH_TEMPERATURE.min - 2}
				Under målet på {TARGET_DOUGH_TEMPERATURE.min}-{TARGET_DOUGH_TEMPERATURE.max} °C — dejen hæver
				ca. <strong>{slowerThanTarget} % langsommere</strong> end ved {TARGET_DOUGH_TEMPERATURE.min} °C.
				Brug lunere vand.
			{:else if doughTemperature < TARGET_DOUGH_TEMPERATURE.min}
				Lidt under målet på {TARGET_DOUGH_TEMPERATURE.min}-{TARGET_DOUGH_TEMPERATURE.max} °C. Fint til
				en lang hævning — dejen kommer blot en smule langsommere i gang.
			{:else}
				Inden for målet på {TARGET_DOUGH_TEMPERATURE.min}-{TARGET_DOUGH_TEMPERATURE.max} °C. Mål med et
				stegetermometer lige efter æltning.
			{/if}
		</p>
	</label>

	<details class="why">
		<summary>Hvorfor {TARGET_DOUGH_TEMPERATURE.min}-{TARGET_DOUGH_TEMPERATURE.max} °C?</summary>
		<div class="why-body">
			<p>
				Gæren tager ikke skade ved {TARGET_DOUGH_TEMPERATURE.max} °C — den har det fint til et godt stykke
				over 30 °C. Grænsen handler om <strong>kontrol</strong>. Jo varmere dejen er, jo hurtigere
				hæver den, groft regnet dobbelt så hurtigt for hver 8 °C.
			</p>
			<p>
				Over ca. {TARGET_DOUGH_TEMPERATURE.max} °C går det så stærkt, at dejen er færdighævet, før smagen
				har nået at udvikle sig. Den bliver slap og fuld af gas og er svær at åbne til en pizza, og vinduet
				til at ramme den på det rigtige tidspunkt bliver kort.
			</p>
			{#if isYeast}
				<p>
					Gærmængden her er regnet med dejens temperatur, så <em>farten</em> er der taget højde for. Men
					færre gram gær gør ikke en varm dej mindre slap, og en varm dej, der skal på køl, hæver videre
					i timevis, mens den køler ned.
				</p>
			{:else}
				<p>
					Surdejens tider her er estimater ved stuetemperatur og regnes ikke om efter dejens
					temperatur. En varm surdej er klar før estimatet, så hold øje med dejen frem for uret — og
					en varm dej, der skal på køl, hæver videre i timevis, mens den køler ned.
				</p>
			{/if}
			{#if lotsOfWholegrain}
				<p>
					Med {workbench.strength.wholegrainPercentage} % fuldkorn sigter mange lavere, omkring 23 °C,
					fordi klidet i forvejen fremskynder hævningen.
				</p>
			{/if}
			<p>
				Grænsen er en tommelfingerregel, ikke en fysisk tærskel — en biga holdes typisk på 18-20 °C.
				Den vandtemperatur, der rammer målet, kan regnes ud under Reference.
			</p>
		</div>
	</details>

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
				{REFERENCE_ROOM_TEMPERATURE} °C{isYeast ? ' — gærmængden er justeret efter det' : ''}.
			{/if}
		</p>
	</label>

	<p class="hint">
		Tempereringen tælles med efter hvor hurtigt dejen faktisk bliver varm igen, og en varm dej hæver
		videre, mens den køler ned i køleskabet. Begge dele er regnet ind i gærmængden.
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
		min-height: 44px;
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

	.why {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-background);
	}

	/* display:flex drops the native triangle, so the marker is drawn here — the
	   same pattern as the <details> in DoughControls */
	.why summary {
		display: flex;
		align-items: center;
		gap: var(--spacing-xs);
		min-height: 44px;
		padding: 0 var(--spacing-sm);
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-accent-text);
		cursor: pointer;
		list-style: none;
	}

	.why summary::-webkit-details-marker {
		display: none;
	}

	.why summary::before {
		content: '▸';
		display: inline-block;
		transition: transform 0.15s ease;
	}

	.why[open] summary::before {
		transform: rotate(90deg);
	}

	@media (prefers-reduced-motion: reduce) {
		.why summary::before {
			transition: none;
		}
	}

	.why-body {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		padding: 0 var(--spacing-sm) var(--spacing-sm);
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
		max-width: 60ch;
	}

	.why-body p {
		margin: 0;
	}

	.styles {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.autolyse {
		display: flex;
		align-items: end;
		gap: var(--spacing-md);
		flex-wrap: wrap;
	}

	.toggle {
		display: inline-flex;
		align-items: center;
		gap: var(--spacing-xs);
		min-height: 44px;
		font-size: var(--font-size-sm);
		font-weight: 600;
		cursor: pointer;
	}

	.toggle input {
		width: 20px;
		height: 20px;
		accent-color: var(--color-primary);
	}

	.field.inline {
		max-width: 12rem;
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
