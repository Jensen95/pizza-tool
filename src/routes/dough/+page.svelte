<script lang="ts">
	import DoughSizingSection from '$lib/components/dough/DoughSizingSection.svelte';
	import DoughRecipeSection from '$lib/components/dough/DoughRecipeSection.svelte';
	import PredoughSection from '$lib/components/dough/PredoughSection.svelte';
	import TimeSection from '$lib/components/dough/TimeSection.svelte';
	import ResultPanel from '$lib/components/dough/ResultPanel.svelte';
	import SavedPlansSection from '$lib/components/dough/SavedPlansSection.svelte';
	import { workbench } from '$lib/stores/dough-workbench.svelte';
	import { formatWeight } from '$lib/utils/baker-percentage';

	let resultOpen = $state(false);

	// The deadline shrinks in real time, so the plan needs a heartbeat.
	$effect(() => {
		const interval = setInterval(() => (workbench.nowMs = Date.now()), 60_000);
		return () => clearInterval(interval);
	});

	let summary = $derived.by(() => {
		if (workbench.yeastPlan) {
			return `${workbench.yeastPlan.yeastWeight} g gær · ${formatWeight(workbench.totalDoughWeight)} dej`;
		}
		if (workbench.sourdoughPlan) {
			return `${workbench.sourdoughPlan.starterWeight} g surdej · ${formatWeight(workbench.totalDoughWeight)} dej`;
		}
		return 'Angiv hævetid';
	});
</script>

<svelte:head>
	<title>Dej - Pizza Tool</title>
	<meta
		name="description"
		content="Planlæg dej efter klokken: vælg hvornår den skal være klar, og få gærmængde, ingredienser og tidsplan."
	/>
</svelte:head>

<div class="dough-page" data-testid="dough-planner">
	<header class="page-header">
		<p class="eyebrow">Dejplanlægger</p>
		<h1>Planlæg dejen</h1>
		<p class="lead">
			Sig hvor meget dej du skal have, hvad der er i den, og hvornår den skal være klar — så regnes
			gærmængden, ingredienserne og tidsplanen ud. Virker til pizza, boller og brød, med eller uden
			køleskab.
		</p>
	</header>

	<div class="workbench">
		<div class="form-column card" data-testid="dough-form">
			<DoughSizingSection {workbench} />
			<hr />
			<DoughRecipeSection {workbench} />
			<hr />
			{#if workbench.leavening === 'yeast'}
				<!-- Predough math only feeds the yeast planner; sourdough has its own starter -->
				<PredoughSection {workbench} />
				<hr />
			{/if}
			<TimeSection {workbench} />
			<hr />
			<SavedPlansSection {workbench} />
		</div>

		<aside class="result-column" class:open={resultOpen}>
			<button
				class="summary-bar"
				type="button"
				aria-expanded={resultOpen}
				aria-controls="result-body"
				onclick={() => (resultOpen = !resultOpen)}
			>
				<span class="summary-text">{summary}</span>
				<span class="summary-toggle">{resultOpen ? 'Skjul' : 'Vis plan'}</span>
			</button>

			<div class="result-body card" id="result-body" data-testid="dough-result">
				<ResultPanel {workbench} />
			</div>
		</aside>
	</div>
</div>

<style>
	.dough-page {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-lg);
		padding-bottom: 4rem;
	}

	.page-header {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-xs);
	}

	.eyebrow {
		margin: 0;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		font-size: var(--font-size-xs);
		color: var(--color-primary);
		font-weight: 700;
	}

	.page-header h1 {
		margin: 0;
	}

	.lead {
		margin: 0;
		color: var(--color-text-secondary);
		max-width: 60ch;
	}

	.workbench {
		display: grid;
		grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
		gap: var(--spacing-lg);
		align-items: start;
	}

	.form-column {
		display: flex;
		flex-direction: column;
		gap: var(--spacing-md);
		padding: var(--spacing-lg);
	}

	hr {
		border: none;
		border-top: 1px solid var(--color-border);
		margin: 0;
	}

	/* The grid item has to span the whole row, otherwise the sticky panel inside it
	   has no room to travel and never actually sticks. */
	.result-column {
		align-self: stretch;
	}

	.summary-bar {
		display: none;
	}

	.result-body {
		/* Sticks below the sticky header and scrolls inside itself, so the yeast
		   figure stays on screen while the form is being edited. */
		position: sticky;
		top: calc(var(--header-height) + var(--spacing-md));
		max-height: calc(100vh - var(--header-height) - var(--nav-height) - var(--spacing-md) * 2);
		overflow-y: auto;
		padding: var(--spacing-lg);
	}

	@media (max-width: 960px) {
		.workbench {
			grid-template-columns: 1fr;
		}

		.result-column {
			position: fixed;
			left: 0;
			right: 0;
			bottom: var(--nav-height);
			z-index: 90;
			top: auto;
			display: flex;
			flex-direction: column;
			max-height: calc(100vh - var(--nav-height) - var(--header-height));
			padding-bottom: env(safe-area-inset-bottom);
		}

		.summary-bar {
			display: flex;
			justify-content: space-between;
			align-items: center;
			gap: var(--spacing-sm);
			width: 100%;
			min-height: 52px;
			padding: var(--spacing-sm) var(--spacing-md);
			background: var(--color-primary);
			color: var(--color-text-light);
			font-weight: 600;
			border-top: 1px solid var(--color-primary-dark);
			text-align: left;
		}

		.summary-text {
			font-variant-numeric: tabular-nums;
		}

		.summary-toggle {
			font-size: var(--font-size-xs);
			text-transform: uppercase;
			letter-spacing: 0.06em;
		}

		.result-body {
			display: none;
			position: static;
			max-height: none;
			overflow-y: auto;
			border-radius: 0;
			box-shadow: none;
			border-top: 1px solid var(--color-border);
		}

		.result-column.open .result-body {
			display: block;
		}

		.dough-page {
			padding-bottom: 5rem;
		}
	}
</style>
