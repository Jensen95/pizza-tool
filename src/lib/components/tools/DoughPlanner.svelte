<script lang="ts">
	import type { YeastInfo } from '$lib/models';
	import { yeastInfo } from '$lib/data/reference';
	import {
		planDough,
		flourFromDoughWeight,
		type DoughPlanInput,
		type DoughPlanWarning
	} from '$lib/utils/dough-planner';
	import { doughPlans, type SavedDoughPlan } from '$lib/stores/dough-plans';

	type WeightMode = 'flour' | 'dough';

	let planName = $state('');
	let weightMode = $state<WeightMode>('flour');
	let flourWeight = $state(1000);
	let doughWeight = $state(1700);
	let hydrationPercentage = $state(65);
	let saltPercentage = $state(2.5);
	let oilPercentage = $state(0);
	let sugarPercentage = $state(0);
	let yeastType = $state<YeastInfo['type']>('fresh');
	let roomHours = $state(4);
	let fridgeHours = $state(0);
	let savedMessage = $state('');

	const warningLabels: Record<DoughPlanWarning, string> = {
		'no-proof-time': 'Angiv mindst én hævetid.',
		'outside-table':
			'Tiden ligger uden for opslagstabellen (2-18 t ved stuetemperatur, 24-72 t på køl) — gærmængden er et estimat.',
		'tiny-yeast-amount':
			'Gærmængden er under 0,1 g og svær at afveje. Overvej kortere hævetid eller lav en større dej og frys noget af den.'
	};

	let nonFlourPercentageSum = $derived(
		hydrationPercentage + saltPercentage + oilPercentage + sugarPercentage
	);
	let effectiveFlourWeight = $derived(
		weightMode === 'flour' ? flourWeight : flourFromDoughWeight(doughWeight, nonFlourPercentageSum)
	);

	let planInput = $derived<DoughPlanInput>({
		flourWeight: effectiveFlourWeight,
		hydrationPercentage,
		saltPercentage,
		oilPercentage,
		sugarPercentage,
		yeastType,
		roomHours,
		fridgeHours
	});

	let plan = $derived(planDough(planInput));
	let yeastName = $derived(yeastInfo.find((info) => info.type === yeastType)?.nameDa ?? yeastType);
	let totalHours = $derived(Math.max(0, roomHours) + Math.max(0, fridgeHours));

	function formatHours(hours: number): string {
		const whole = Math.floor(hours);
		const minutes = Math.round((hours - whole) * 60);
		if (minutes === 0) return `${whole} t`;
		if (whole === 0) return `${minutes} min`;
		return `${whole} t ${minutes} min`;
	}

	function savePlan() {
		doughPlans.savePlan(planName, planInput);
		savedMessage = 'Opskriften er gemt.';
		setTimeout(() => (savedMessage = ''), 3000);
	}

	function loadPlan(saved: SavedDoughPlan) {
		planName = saved.name;
		weightMode = 'flour';
		flourWeight = saved.input.flourWeight;
		hydrationPercentage = saved.input.hydrationPercentage;
		saltPercentage = saved.input.saltPercentage;
		oilPercentage = saved.input.oilPercentage;
		sugarPercentage = saved.input.sugarPercentage;
		yeastType = saved.input.yeastType;
		roomHours = saved.input.roomHours;
		fridgeHours = saved.input.fridgeHours;
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('da-DK', {
			day: 'numeric',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

<div class="tool-card" data-testid="dough-planner">
	<div class="card-header">
		<div>
			<p class="eyebrow">Dejplanlægger</p>
			<h2>Planlæg din hævning — til alt slags dej</h2>
			<p class="muted">
				Indtast hvor længe dejen skal hæve ved stuetemperatur (ca. 20-22 °C) og/eller i køleskabet,
				så beregnes gærmængden til en perfekt hævet dej. Gem planen som opskrift til næste gang.
			</p>
		</div>
	</div>

	<div class="section">
		<h3>Dejen</h3>
		<div class="input-grid">
			<label class="field">
				<span class="label">Beregn ud fra</span>
				<select class="input" bind:value={weightMode} aria-label="Beregn ud fra">
					<option value="flour">Melvægt</option>
					<option value="dough">Samlet dejvægt</option>
				</select>
			</label>

			{#if weightMode === 'flour'}
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
			{:else}
				<label class="field">
					<span class="label">Dejvægt</span>
					<div class="input-with-unit">
						<input
							class="input"
							type="number"
							min="0"
							step="10"
							bind:value={doughWeight}
							aria-label="Samlet dejvægt i gram"
						/>
						<span class="unit">g</span>
					</div>
				</label>
			{/if}

			<label class="field">
				<span class="label">Hydration</span>
				<div class="input-with-unit">
					<input
						class="input"
						type="number"
						min="0"
						max="120"
						step="0.5"
						bind:value={hydrationPercentage}
						aria-label="Hydration i procent"
					/>
					<span class="unit">%</span>
				</div>
			</label>

			<label class="field">
				<span class="label">Salt</span>
				<div class="input-with-unit">
					<input
						class="input"
						type="number"
						min="0"
						max="5"
						step="0.1"
						bind:value={saltPercentage}
						aria-label="Salt i procent"
					/>
					<span class="unit">%</span>
				</div>
			</label>

			<label class="field">
				<span class="label">Olie</span>
				<div class="input-with-unit">
					<input
						class="input"
						type="number"
						min="0"
						max="15"
						step="0.5"
						bind:value={oilPercentage}
						aria-label="Olie i procent"
					/>
					<span class="unit">%</span>
				</div>
			</label>

			<label class="field">
				<span class="label">Sukker</span>
				<div class="input-with-unit">
					<input
						class="input"
						type="number"
						min="0"
						max="15"
						step="0.5"
						bind:value={sugarPercentage}
						aria-label="Sukker i procent"
					/>
					<span class="unit">%</span>
				</div>
			</label>

			<label class="field">
				<span class="label">Gærtype</span>
				<select class="input" bind:value={yeastType} aria-label="Gærtype">
					{#each yeastInfo as option}
						<option value={option.type}>{option.nameDa}</option>
					{/each}
				</select>
			</label>
		</div>
	</div>

	<div class="section">
		<h3>Hævetid</h3>
		<div class="input-grid time-grid">
			<label class="field">
				<span class="label">Ved stuetemperatur</span>
				<div class="input-with-unit">
					<input
						class="input"
						type="number"
						min="0"
						max="48"
						step="0.5"
						bind:value={roomHours}
						aria-label="Timer ved stuetemperatur"
					/>
					<span class="unit">timer</span>
				</div>
			</label>

			<label class="field">
				<span class="label">I køleskab</span>
				<div class="input-with-unit">
					<input
						class="input"
						type="number"
						min="0"
						max="120"
						step="1"
						bind:value={fridgeHours}
						aria-label="Timer i køleskab"
					/>
					<span class="unit">timer</span>
				</div>
			</label>
		</div>
	</div>

	{#if plan}
		<div class="results">
			<div class="highlight">
				<div class="muted">{yeastName} til {formatHours(totalHours)} hævning</div>
				<div class="result-value">
					{plan.yeastWeight}
					<span class="unit">g</span>
					<span class="badge">{plan.yeastPercentage.toFixed(3)}%</span>
				</div>
				<div class="muted">Svarer til {plan.idyPercentage.toFixed(3)}% instant gær</div>
			</div>

			<div class="ingredient-table" role="table" aria-label="Ingrediensliste">
				<div class="ingredient-row header" role="row">
					<span role="columnheader">Ingrediens</span>
					<span role="columnheader" class="num">%</span>
					<span role="columnheader" class="num">Gram</span>
				</div>
				{#each plan.ingredients as ingredient (ingredient.id)}
					<div class="ingredient-row" role="row">
						<span role="cell">{ingredient.nameDa}</span>
						<span role="cell" class="num">{ingredient.percentage.toFixed(1)}%</span>
						<span role="cell" class="num">{ingredient.weight} g</span>
					</div>
				{/each}
				<div class="ingredient-row total" role="row">
					<span role="cell">Total</span>
					<span role="cell" class="num"></span>
					<span role="cell" class="num">{plan.totalWeight} g</span>
				</div>
			</div>

			<ol class="schedule">
				<li>Ælt dejen og lad den samle sig.</li>
				{#if roomHours > 0}
					<li>Hæv ved stuetemperatur i {formatHours(roomHours)}.</li>
				{/if}
				{#if fridgeHours > 0}
					<li>Sæt dejen i køleskabet i {formatHours(fridgeHours)}.</li>
					<li>Tag dejen ud og lad den temperere før brug.</li>
				{/if}
				<li>Dejen er klar til at forme og bage.</li>
			</ol>

			{#each plan.warnings as warning}
				<p class="warning">{warningLabels[warning]}</p>
			{/each}
		</div>
	{:else}
		<p class="warning">{warningLabels['no-proof-time']}</p>
	{/if}

	<div class="section save-section">
		<h3>Gem som opskrift</h3>
		<div class="save-row">
			<input
				class="input"
				type="text"
				placeholder="Navn, fx Focaccia lørdag"
				bind:value={planName}
				aria-label="Navn på opskrift"
			/>
			<button class="button primary" type="button" onclick={savePlan} disabled={!plan}>
				Gem plan
			</button>
		</div>
		{#if savedMessage}
			<p class="saved-message" role="status">{savedMessage}</p>
		{/if}

		{#if $doughPlans.length > 0}
			<ul class="saved-list">
				{#each $doughPlans as saved (saved.id)}
					<li class="saved-item">
						<div class="saved-info">
							<span class="saved-name">{saved.name}</span>
							<span class="muted">
								{formatDate(saved.createdAt)} · {saved.input.hydrationPercentage}% hydration ·
								{formatHours(
									Math.max(0, saved.input.roomHours) + Math.max(0, saved.input.fridgeHours)
								)}
							</span>
						</div>
						<div class="saved-actions">
							<button class="button" type="button" onclick={() => loadPlan(saved)}> Indlæs </button>
							<button
								class="button danger"
								type="button"
								aria-label={`Slet ${saved.name}`}
								onclick={() => doughPlans.deletePlan(saved.id)}
							>
								Slet
							</button>
						</div>
					</li>
				{/each}
			</ul>
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

	.section h3 {
		margin: 0 0 var(--spacing-sm);
		font-size: var(--font-size-md);
	}

	.input-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: var(--spacing-sm);
		align-items: end;
	}

	.time-grid {
		grid-template-columns: repeat(2, 1fr);
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

	.badge {
		background: var(--color-primary);
		color: var(--color-text-light);
		padding: 2px 8px;
		border-radius: var(--radius-full);
		font-size: var(--font-size-xs);
	}

	.ingredient-table {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		overflow: hidden;
	}

	.ingredient-row {
		display: grid;
		grid-template-columns: 1fr auto auto;
		gap: var(--spacing-md);
		padding: var(--spacing-xs) var(--spacing-md);
		border-bottom: 1px solid var(--color-border);
	}

	.ingredient-row:last-child {
		border-bottom: none;
	}

	.ingredient-row.header {
		background: var(--color-background);
		font-weight: 600;
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
	}

	.ingredient-row.total {
		font-weight: 700;
		background: var(--color-background);
	}

	.num {
		text-align: right;
		min-width: 64px;
		font-variant-numeric: tabular-nums;
	}

	.schedule {
		margin: 0;
		padding-left: var(--spacing-lg);
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.warning {
		margin: 0;
		padding: var(--spacing-sm) var(--spacing-md);
		border-radius: var(--radius-md);
		background: rgba(var(--color-primary-rgb), 0.08);
		border: 1px solid var(--color-primary-light);
		color: var(--color-text);
		font-size: var(--font-size-sm);
	}

	.save-row {
		display: flex;
		gap: var(--spacing-sm);
	}

	.save-row .input {
		flex: 1;
	}

	.button {
		min-height: 44px;
		min-width: 44px;
		padding: 0 var(--spacing-md);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border);
		background: var(--color-surface);
		color: var(--color-text);
		font-weight: 600;
		cursor: pointer;
	}

	.button.primary {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-text-light);
	}

	.button.danger {
		color: var(--color-error, var(--color-primary));
	}

	.button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.saved-message {
		margin: var(--spacing-xs) 0 0;
		color: var(--color-primary);
		font-size: var(--font-size-sm);
	}

	.saved-list {
		list-style: none;
		margin: var(--spacing-sm) 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.saved-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--spacing-sm);
		padding: var(--spacing-sm);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-background);
	}

	.saved-info {
		display: flex;
		flex-direction: column;
		gap: 2px;
		min-width: 0;
	}

	.saved-name {
		font-weight: 600;
	}

	.saved-actions {
		display: flex;
		gap: var(--spacing-xs);
		flex-shrink: 0;
	}

	@media (max-width: 720px) {
		.input-grid {
			grid-template-columns: repeat(2, 1fr);
		}

		.saved-item {
			flex-direction: column;
			align-items: stretch;
		}

		.saved-actions {
			justify-content: flex-end;
		}
	}
</style>
