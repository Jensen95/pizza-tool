<script lang="ts">
	import { yeastInfo } from '$lib/data/reference';
	import { formatWeight } from '$lib/utils/baker-percentage';
	import { convertYeastPercentage } from '$lib/utils/yeast';
	import { formatHours, warningLabels } from '$lib/utils/format-plan';
	import ProofingTimeline from './ProofingTimeline.svelte';
	import PlanSteps from './PlanSteps.svelte';
	import type { DoughWorkbench } from '$lib/stores/dough-workbench.svelte';

	let { workbench }: { workbench: DoughWorkbench } = $props();

	let plan = $derived(workbench.yeastPlan);
	let sourdough = $derived(workbench.sourdoughPlan);
	let yeastName = $derived(
		yeastInfo.find((info) => info.type === workbench.yeastType)?.nameDa ?? workbench.yeastType
	);
	let stages = $derived(
		plan?.stages ??
			(sourdough
				? [
						{
							id: 'main' as const,
							nameDa: 'Dejen',
							ingredients: sourdough.ingredients,
							totalWeight: sourdough.totalWeight
						}
					]
				: [])
	);
	let warnings = $derived(plan?.warnings ?? sourdough?.warnings ?? []);
	let perBall = $derived(
		workbench.sizingMode === 'balls' && workbench.ballCount > 0
			? workbench.totalDoughWeight / workbench.ballCount
			: 0
	);
	let freshEquivalent = $derived(
		plan ? convertYeastPercentage(plan.idyPercentage, 'instant', 'fresh') : 0
	);

	/** Yeast sits at fractions of a percent, so one decimal would round it to nothing. */
	function formatPercentage(percentage: number): string {
		return percentage > 0 && percentage < 1 ? percentage.toFixed(3) : percentage.toFixed(1);
	}
</script>

<div class="panel">
	<h2 class="panel-title">Resultat</h2>

	{#if plan}
		<div class="highlight">
			<p class="muted">{yeastName} til {formatHours(workbench.totalProofHours)} hævning</p>
			<p class="value">
				{plan.yeastWeight}
				<span class="value-unit">g</span>
				<span class="badge badge-primary">{plan.yeastPercentage.toFixed(3)} %</span>
			</p>
			<p class="muted">
				Svarer til {plan.idyPercentage.toFixed(3)} % instant gær ({freshEquivalent.toFixed(3)} % frisk)
			</p>
			{#if plan.predough}
				<p class="muted split-note">
					Heraf {plan.predoughYeastWeight} g i {plan.predough.nameDa.toLowerCase()} og
					{plan.mainYeastWeight} g i hoveddejen
				</p>
			{/if}
		</div>
	{:else if sourdough}
		<div class="highlight">
			<p class="muted">Surdej ({workbench.starterHydrationPercentage} % hydration)</p>
			<p class="value">
				{sourdough.starterWeight}
				<span class="value-unit">g</span>
				<span class="badge badge-primary">{workbench.starterPercentage} %</span>
			</p>
			<p class="muted">
				Indeholder {sourdough.flourInStarter} g mel og {sourdough.waterInStarter} g vand
			</p>
		</div>
	{:else}
		<p class="empty">{warningLabels['no-proof-time']}</p>
	{/if}

	{#if plan || sourdough}
		<div class="stats">
			<div class="stat">
				<span class="label">Hydration</span>
				<strong>{workbench.hydrationPercentage.toFixed(1)} %</strong>
			</div>
			<div class="stat">
				<span class="label">Samlet dej</span>
				<strong>{formatWeight(workbench.totalDoughWeight)}</strong>
			</div>
			<div class="stat">
				<span class="label">Mel</span>
				<strong>{formatWeight(workbench.resolvedFlourWeight)}</strong>
			</div>
			{#if perBall > 0}
				<div class="stat">
					<span class="label">Pr. kugle</span>
					<strong>{formatWeight(perBall)}</strong>
				</div>
			{:else}
				<div class="stat">
					<span class="label">Mod mål {workbench.targetHydrationPercentage} %</span>
					<strong>
						{workbench.hydrationDelta === 0
							? 'på målet'
							: `${workbench.hydrationDelta > 0 ? '+' : ''}${workbench.hydrationDelta} g vand`}
					</strong>
				</div>
			{/if}
		</div>

		{#each stages as stage (stage.id)}
			<div class="table-wrap">
				{#if stages.length > 1}
					<h3 class="stage-name">{stage.nameDa}</h3>
				{/if}
				<table>
					<thead>
						<tr>
							<th scope="col">Ingrediens</th>
							<th scope="col" class="num">%</th>
							<th scope="col" class="num">Gram</th>
						</tr>
					</thead>
					<tbody>
						{#each stage.ingredients as ingredient (ingredient.id)}
							<tr>
								<td>{ingredient.nameDa}</td>
								<td class="num">{formatPercentage(ingredient.percentage)}</td>
								<td class="num">{ingredient.weight}</td>
							</tr>
						{/each}
						<tr class="total">
							<td>{stages.length > 1 ? 'Delvægt' : 'Total'}</td>
							<td class="num"></td>
							<td class="num">{stage.totalWeight}</td>
						</tr>
					</tbody>
				</table>
			</div>
		{/each}

		{#if stages.length > 1}
			<p class="grand-total">
				Samlet dejvægt <strong>{formatWeight(workbench.totalDoughWeight)}</strong>
			</p>
		{/if}

		<div class="plan-block">
			<h3>Tidsplan</h3>
			<ProofingTimeline steps={workbench.steps} />
			<PlanSteps steps={workbench.steps} />
		</div>

		{#if sourdough}
			<p class="muted">
				Estimeret bulkhævning {sourdough.schedule.bulkFermentation.min}-{sourdough.schedule
					.bulkFermentation.max} timer, endelig hævning {sourdough.schedule.finalProofRoom
					.min}-{sourdough.schedule.finalProofRoom.max} timer ved stuetemperatur eller {sourdough
					.schedule.finalProofFridge.min}-{sourdough.schedule.finalProofFridge.max} timer på køl.
			</p>
		{/if}

		{#each warnings as warning (warning)}
			<p class="warning">{warningLabels[warning]}</p>
		{/each}
	{/if}
</div>

<style>
	.panel {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
	}

	.panel-title {
		font-size: var(--font-size-lg);
		margin: 0;
	}

	.muted {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.highlight {
		background: rgba(var(--color-primary-rgb), 0.06);
		border: 1px solid var(--color-primary-light);
		border-radius: var(--radius-md);
		padding: var(--spacing-md);
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.value {
		margin: 0;
		font-size: var(--font-size-2xl);
		font-weight: 700;
		display: flex;
		align-items: baseline;
		gap: var(--spacing-xs);
		font-variant-numeric: tabular-nums;
	}

	.value-unit {
		font-size: var(--font-size-md);
		font-weight: 500;
	}

	.split-note {
		margin-top: var(--spacing-xs);
	}

	.empty {
		margin: 0;
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--spacing-xs);
	}

	.stat {
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		padding: var(--spacing-xs) var(--spacing-sm);
		background: var(--color-background);
		display: flex;
		flex-direction: column;
	}

	.stat strong {
		font-variant-numeric: tabular-nums;
	}

	.table-wrap {
		overflow-x: auto;
	}

	.stage-name {
		font-size: var(--font-size-sm);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-secondary);
		margin: 0 0 var(--spacing-xs);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--font-size-sm);
	}

	th {
		text-align: left;
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--color-text-secondary);
		padding: var(--spacing-xs);
		border-bottom: 1px solid var(--color-border);
	}

	td {
		padding: var(--spacing-xs);
		border-bottom: 1px solid var(--color-border);
	}

	tr.total td {
		font-weight: 700;
		background: var(--color-background);
		border-bottom: none;
	}

	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.grand-total {
		margin: 0;
		font-size: var(--font-size-sm);
		display: flex;
		justify-content: space-between;
	}

	.plan-block {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-sm);
	}

	.plan-block h3 {
		font-size: var(--font-size-md);
		margin: 0;
	}

	.warning {
		margin: 0;
		padding: var(--spacing-sm);
		border-radius: var(--radius-md);
		background: var(--color-warning-bg);
		border: 1px solid var(--color-warning-border);
		font-size: var(--font-size-sm);
	}
</style>
